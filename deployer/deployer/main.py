from fabric.contrib.files import exists
try: 
    input = raw_input
except NameError: 
    pass
from datetime import datetime
import os
import sys
import time

import boto.ec2
from fabric.api import env, run, sudo, cd, put
from fabric.exceptions import NetworkError
import requests
from transitfeed.gtfsfactory import GetGtfsFactory
from transitfeed.problems import ProblemReporter, TYPE_WARNING
import transitfeed


from deployer import REPORTS_DIR, CONFIG_TEMPLATE_DIR, DL_DIR
from deployer.config import get_aws_config, get_gtfs_config,\
    get_ontransit_config
from deployer.fab_crontab import crontab_update
from deployer.feedvalidator import HTMLCountingProblemAccumulator
from deployer.util import FabLogger, write_template, unix_path_join


GTFS_FILE_NAME_RAW = 'google_transit_{0}.zip'.format(datetime.now().strftime('%Y-%m-%d'))
GTFS_FILE_NAME = os.path.join(DL_DIR, GTFS_FILE_NAME_RAW)


class Fab:
    
    aws_conf = get_aws_config()
    gtfs_conf = get_gtfs_config()
    ontransit_conf = get_ontransit_config()
    ontransit_base_folder = ontransit_conf.get('ontransit_base_folder')
    ontransit_server_folder = unix_path_join(ontransit_base_folder, 'server')
    ontransit_web_folder = unix_path_join(ontransit_base_folder, 'web')
    
    def __init__(self, user_type, host_name, ssh_sleep=10):
        '''Constructor for Class.  Sets up fabric environment.
        
        Args:
            user_type (string): the linux user type
            host_name (string): ec2 public dns name
            ssh_sleep (int, default=10): number of seconds to sleep between ssh tries
        '''
        
        if user_type == 'root':
            self.user = self.aws_conf.get('root_user')
            self.user_home = unix_path_join('/root')
            self.server_config_dir = unix_path_join(self.user_home, 'conf')
            self.script_dir = unix_path_join(self.user_home, 'scripts')
            self.data_dir = unix_path_join(self.user_home, 'data')
        else:
            env.password = self.aws_conf.get('regular_user_password')
            self.user = self.aws_conf.get('regular_user_name')
            self.user_home = unix_path_join('/home', self.user)
            self.server_config_dir = unix_path_join(self.user_home, 'conf')
            self.script_dir = unix_path_join(self.user_home, 'scripts')
            self.data_dir = unix_path_join(self.user_home, 'data')
        
        env.host_string = '{0}@{1}'.format(self.user, host_name)
        env.key_filename = [self.aws_conf.get('key_filename')]
        sys.stdout = FabLogger(os.path.join(REPORTS_DIR, 'aws_fab.log'))
        
        max_retries = 6
        num_retries = 0
        
        retry = True
        while retry:
            try:
                # SSH into the box here.
                self.test_cmd()
                retry = False
            except NetworkError as e:
                print(e)
                if num_retries > max_retries:
                    raise Exception('Maximum Number of SSH Retries Hit.  Did EC2 instance get configured with ssh correctly?')
                num_retries += 1 
                print('SSH failed (the system may still be starting up), waiting {0} seconds...'.format(ssh_sleep))
                time.sleep(ssh_sleep)
        
    def test_cmd(self):
        '''A test command to see if everything is running ok.
        '''
        
        run('uname')
        
    def new_user(self):
        '''Setup a non-root user.
        '''
        
        regular_user_name = self.aws_conf.get('regular_user_name')
        
        run('adduser {0}'.format(regular_user_name))
        run('echo {0} | passwd {1} --stdin'.
            format(self.aws_conf.get('regular_user_password'),
                   regular_user_name))
        
        # grant sudo access to regular user
        put(write_template(dict(regular_user_name=regular_user_name),
                           'user-init'),
            '/etc/sudoers.d',
            True)
        
    def update_system(self):
        '''Updates the instance with the latest patches and upgrades.
        '''
        
        sudo('yum -y update')
        
    def set_timezone(self):
        '''Changes the machine's localtime to the desired timezone.
        '''
        
        with cd('/etc'):
            sudo('rm -rf localtime')
            sudo('ln -s {0} localtime'.format(self.aws_conf.get('timezone')))        
        
    def install_custom_monitoring(self):
        '''Installs a custom monitoring script to monitor memory and disk utilization.
        '''
        
        # install helpers
        sudo('yum -y install perl-DateTime perl-Sys-Syslog perl-LWP-Protocol-https')
        
        # dl scripts
        run('wget http://aws-cloudwatch.s3.amazonaws.com/downloads/CloudWatchMonitoringScripts-1.2.1.zip')
        sudo('unzip CloudWatchMonitoringScripts-1.2.1.zip -d /usr/local')
        run('rm CloudWatchMonitoringScripts-1.2.1.zip')
        
        # prepare the monitoring crontab        
        with open(os.path.join(CONFIG_TEMPLATE_DIR, 'monitoring_crontab')) as f:
            cron = f.read()
        
        cron_settings = dict(aws_access_key_id=self.aws_conf.get('aws_access_key_id'),
                             aws_secret_key=self.aws_conf.get('aws_secret_access_key'),
                             cron_email=self.aws_conf.get('cron_email'))  
        aws_logging_cron = cron.format(**cron_settings)
            
        # start crontab for aws monitoring
        crontab_update(aws_logging_cron, 'aws_monitoring')
        
    def install_helpers(self):
        '''Installs various utilities (typically not included with CentOS).
        '''
        
        sudo('yum -y install wget')
        sudo('yum -y install unzip')
    
    def install_git(self):
        '''Installs git.
        '''
        
        sudo('yum -y install git')
        
    def upload_pg_hba_conf(self, local_method):
        '''Overwrites pg_hba.conf with specified local method.
        '''
        
        remote_data_folder = '/var/lib/pgsql/9.3/data'
        remote_pg_hba_conf = '/var/lib/pgsql/9.3/data/pg_hba.conf'
        
        sudo('rm -rf {0}'.format(remote_pg_hba_conf))
        
        put(write_template(dict(local_method=local_method), 'pg_hba.conf'),
            remote_data_folder,
            True)
        
        with cd(remote_data_folder):
            sudo('chmod 600 pg_hba.conf')
            sudo('chgrp postgres pg_hba.conf')
            sudo('chown postgres pg_hba.conf')
        
    def install_pg(self):
        '''Downloads and configures PostgreSQL.
        '''
        
        # get yum squared away
        sudo('rpm -ivh http://yum.postgresql.org/9.3/redhat/rhel-6-x86_64/pgdg-centos93-9.3-1.noarch.rpm')
        
        # install postgresql
        sudo('yum -y install postgresql93 postgresql93-server postgresql93-libs postgresql93-contrib postgresql93-devel')
        
        # make sure yum knows about postgis dependencies
        sudo('rpm -ivh http://dl.fedoraproject.org/pub/epel/6/x86_64/epel-release-6-8.noarch.rpm')
        
        # install postgis
        sudo('yum -y install postgis2_93')
        
        # initialize db
        sudo('service postgresql-9.3 initdb')
        
        # upload insecure pg_hba.conf
        self.upload_pg_hba_conf('trust')
        
        db_setup_dict = dict(pg_worker_username=self.ontransit_conf.get('pg_worker_username'),
                             pg_worker_password=self.ontransit_conf.get('pg_worker_password'),
                             pg_web_username=self.ontransit_conf.get('pg_web_username'),
                             pg_web_password=self.ontransit_conf.get('pg_web_password'),
                             pg_worker_groupname=self.ontransit_conf.get('pg_worker_groupname'),
                             database_name=self.ontransit_conf.get('database_name'))
        
        if not exists(self.server_config_dir):
            run('mkdir {0}'.format(self.server_config_dir))
        
        put(write_template(db_setup_dict, 'db_setup.sql'),
            self.server_config_dir)
        
        # start postgres
        sudo('service postgresql-9.3 start')
        
        # execute db setup sql
        sudo('psql -U postgres -f {0}'.format(unix_path_join(self.server_config_dir, 'db_setup.sql')))
        sudo('psql -U postgres -d {0} -c "CREATE EXTENSION postgis;"'.
             format(self.ontransit_conf.get('database_name')))
        
        # switch to more secure pg_hba.conf
        self.upload_pg_hba_conf('md5')
        
        # restart postgres
        sudo('service postgresql-9.3 restart')
        
        # start postgresql on boot
        sudo('chkconfig postgresql-9.3 on')
        
    def install_node(self):
        '''Installs node and npm.
        '''
        
        # download and install from website instead of yum
        run('wget https://nodejs.org/dist/latest/node-v4.0.0-linux-x64.tar.gz')
        run('tar xzf node-v4.0.0-linux-x64.tar.gz -C /usr/local')
        run('rm -rf node-v4.0.0-linux-x64.tar.gz')
        run('mv /usr/local/node-v4.0.0-linux-x64 /usr/local/node')
        run('ln -s /usr/local/node/bin/node /usr/bin/node')
        run('ln -s /usr/local/node/bin/npm /usr/bin/npm')
        
        # install forever to run server continuously
        sudo('npm install forever -g')
        sudo('ln -s /usr/local/node/bin/forever /usr/bin/forever')   
        
    def setup_iptables(self):
        '''Adds in iptables rules to forward 80 to 3000.
        
        Got help from: http://serverfault.com/questions/722270/configuring-centos-6-iptables-to-use-port-80-for-nodejs-app-running-on-port-3000/722282#722282
        '''
        
        sudo('iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT')
        sudo('iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000')
        sudo('iptables -I INPUT 1 -p tcp --dport 3000 -j ACCEPT')
        sudo('sudo service iptables save')
        
    def install_ontransit(self):
        '''Clones and then installs OnTransit.
        '''
        
        run('git clone {0}'.format(self.ontransit_conf.get('ontransit_git_repo')))
        
        with cd(self.ontransit_base_folder):
            run('git checkout {0}'.format(self.ontransit_conf.get('ontransit_git_branch')))
        
        # upload server config
        server_data = dict(gtfs_static_url=self.gtfs_conf.get('gtfs_static_url'),
                           block_delay_delete_threshold=self.ontransit_conf.get('block_delay_delete_threshold'),
                           database_name=self.ontransit_conf.get('database_name'),
                           nearby_stop_future_padding=self.ontransit_conf.get('nearby_stop_future_padding'),
                           nearby_stop_past_padding=self.ontransit_conf.get('nearby_stop_past_padding'),
                           pg_worker_username=self.ontransit_conf.get('pg_worker_username'),
                           pg_worker_password=self.ontransit_conf.get('pg_worker_password'),
                           pg_web_username=self.ontransit_conf.get('pg_web_username'),
                           pg_web_password=self.ontransit_conf.get('pg_web_password'),
                           trip_end_padding=self.ontransit_conf.get('trip_end_padding'),
                           trip_start_padding=self.ontransit_conf.get('trip_start_padding'))
        put(write_template(server_data, 
                           'server_config_index.js', 
                           'index.js'), 
            unix_path_join(self.ontransit_server_folder, 'config'))
        
        with(cd(self.ontransit_server_folder)):
            # install npm stuff
            run('npm install')
            
        # upload web config
        web_data = dict(agency_timezone=self.ontransit_conf.get('agency_timezone'),
                        google_analytics_tracking_key=self.ontransit_conf.get('google_analytics_tracking_key'),
                        google_maps_api_key=self.ontransit_conf.get('google_maps_api_key'))
        put(write_template(web_data, 
                           'web_config.js', 
                           'config.js'), 
            unix_path_join(self.ontransit_web_folder, 'js'))
                
        with(cd(self.ontransit_web_folder)):
            # install npm stuff
            run('npm install')
            
            if not exists('dist'):
                run('mkdir dist')
            
            # build static files            
            run('npm run build')
            
    def update_gtfs(self):
        '''Instructs OnTransit server to immediately reload the transit data.
        '''
        
        with(cd(self.ontransit_server_folder)):
            run('npm run load-gtfs')

    def start_server(self):
        '''Starts the OnTransit server
        '''
        
        with cd(self.ontransit_server_folder):
            run('forever start --uid "ontransit" index.js')
            
    def install_ontransit_cron_scripts(self):
        '''Install cron scripts to make sure ontransit data is up-to-date.
        '''
        
        # check if script folder exists
        if not exists(self.script_dir):
            run('mkdir {0}'.format(self.script_dir))
            
        # check if data folder exists
        if not exists(self.data_dir):
            run('mkdir {0}'.format(self.data_dir))
            
        # prepare nightly update cron script
        with open(os.path.join(CONFIG_TEMPLATE_DIR, 'gtfs_refresh_crontab')) as f:
            cron_template = f.read()
            
        cron_settings = dict(cron_email=self.aws_conf.get('cron_email'),
                             logfile=unix_path_join(self.data_dir, 'nightly_refresh.out'),
                             user=self.user,
                             ontransit_base_folder=self.ontransit_base_folder)
        cron = cron_template.format(**cron_settings)
            
        crontab_update(cron, 'gtfs_refresh_cron')
        
        # prepare block delay purge cron script
        with open(os.path.join(CONFIG_TEMPLATE_DIR, 'block_delay_purge_crontab')) as f:
            cron_template = f.read()
            
        cron_settings = dict(cron_email=self.aws_conf.get('cron_email'),
                             logfile=unix_path_join(self.data_dir, 'blockPurge.out'),
                             user=self.user,
                             ontransit_base_folder=self.ontransit_base_folder)
        cron = cron_template.format(**cron_settings)
            
        crontab_update(cron, 'block_delay_purge_cron')
        
    def stop_server(self):
        '''Stops the OnTransit server.
        '''
        
        # call to stop listener port
        run('forever stop ontransit')    
        

def get_aws_connection():
    '''Connect to AWS.
    
    Returns:
        boto.ec2.connection.EC2Connection: Connection to region.
    '''
    
    print('Connecting to AWS')
    aws_conf = get_aws_config()
    return boto.ec2.connect_to_region(aws_conf.get('region'),
                                      aws_access_key_id=aws_conf.get('aws_access_key_id'),
                                      aws_secret_access_key=aws_conf.get('aws_secret_access_key'))
    
    
def get_fab(user_type, instance_dns_name=None, ssh_sleep=10):
    '''Get a instance of fabric deployer.
    
    Args:
        user_type (string): The user type to use when logging in.  
            Typically "root" when first logging in and then whatever is defined in config. 
        instance_dns_name (string, default=None): The EC2 instance to deploy to.
        
    Returns:
        Fab: a Fab instance
    '''
    
    if not instance_dns_name:
        instance_dns_name = input('Enter EC2 public dns name: ')
        
    return Fab(user_type, instance_dns_name, ssh_sleep)


def launch_new():
    '''Launch a new EC2 instance installing an OBA instance
    
    Retruns:
        String: the dns name of the instance that was launched.
    '''
    
    # connect to AWS and launch new instance
    aws_conf = get_aws_config()
    conn = get_aws_connection()
    
    print('Preparing volume')
    block_device = boto.ec2.blockdevicemapping.EBSBlockDeviceType()
    block_device.size = aws_conf.get('volume_size')
    block_device.delete_on_termination = True
    block_device_map = boto.ec2.blockdevicemapping.BlockDeviceMapping()
    block_device_map[aws_conf.get('block_device_map')] = block_device 
    
    print('Launching new instance')
    reservation = conn.run_instances(aws_conf.get('ami_id'),
                                     instance_type=aws_conf.get('instance_type'),
                                     key_name=aws_conf.get('key_pair_name'),
                                     security_groups=aws_conf.get('security_groups').split(','),
                                     block_device_map=block_device_map)
    
    # Get the instance
    instance = reservation.instances[0]
    
    # Check if it's up and running a specified maximum number of times
    max_retries = 10
    num_retries = 0
    
    # Check up on its status every so often
    status = instance.update()
    while status == 'pending':
        if num_retries > max_retries:
            tear_down(instance.id, conn)
            raise Exception('Maximum Number of Instance Retries Hit.  Did EC2 instance spawn correctly?')
        num_retries += 1 
        print('Instance pending, waiting 10 seconds...')
        time.sleep(10)
        status = instance.update()
    
    if status == 'running':
        instance.add_tag("Name", aws_conf.get('instance_name'))
    else:
        print('Instance status: ' + status)
        return None
    
    # setup regular user
    fab = get_fab('root', instance.public_dns_name, 60)
    fab.new_user()
    
    return instance.public_dns_name
    
    
def install_dependencies(instance_dns_name=None):
    '''Install a bunch of linux stuff and libraries essential to running OnTransit
    '''
    
    root_fab = get_fab('root', instance_dns_name)
    
    # If we've reached this point, the instance is up and running.
    print('SSH working')
    root_fab.update_system()
    root_fab.install_helpers()
    root_fab.install_custom_monitoring()
    root_fab.set_timezone()
    root_fab.install_pg()
    root_fab.install_git()
    root_fab.install_node()
    root_fab.setup_iptables()
    

def tear_down(instance_id=None, conn=None):
    '''Terminates a EC2 instance and deletes all associated volumes.
    
    Args:
        instance_id (string): The ec2 instance id to terminate.
        conn (boto.ec2.connection.EC2Connection): Connection to region.
    '''
    
    if not instance_id:
        instance_id = input('Enter instance id: ')
    
    if not conn:
        conn = get_aws_connection()
        
    volumes = conn.get_all_volumes(filters={'attachment.instance-id': [instance_id]})
        
    print('Terminating instance')
    conn.terminate_instances([instance_id])
    
    aws_conf = get_aws_config()
    if aws_conf.get('delete_volumes_on_tear_down') == 'true':
            
        max_wait_retries = 12
        
        print('Deleting volume(s) associated with instance')
        for volume in volumes:
            volume_deleted = False
            num_retries = 0
            while not volume_deleted:
                try:
                    conn.delete_volume(volume.id)
                    volume_deleted = True
                except Exception as e:
                    if num_retries >= max_wait_retries:
                        raise e
                    print('Waiting for volume to become detached from instance.  Waiting 10 seconds...')
                    time.sleep(10)


def install_ontransit(instance_dns_name=None):
    '''Installs OnTransit on the EC2 instance.
    
    Args:
        instance_dns_name (string, default=None): The EC2 instance to deploy to.
    '''
    
    fab = get_fab('regular', instance_dns_name)
    fab.install_ontransit()
    
    
def validate_gtfs():
    '''Download and validate the latest static GTFS file.
    
    Returns:
        boolean: True if no errors in GTFS.
    '''
    
    # get gtfs settings
    gtfs_conf = get_gtfs_config()
    
    # Create the `downloads` directory if it doesn't exist
    if not os.path.exists(DL_DIR):
        os.makedirs(DL_DIR)
        
    # Create the `reports` directory if it doesn't exist
    if not os.path.exists(REPORTS_DIR):
        os.makedirs(REPORTS_DIR)
    
    # download gtfs
    print('Downloading GTFS')
    r = requests.get(gtfs_conf.get('gtfs_static_url'), stream=True)
    with open(GTFS_FILE_NAME, 'wb') as f:
        for chunk in r.iter_content(chunk_size=1024): 
            if chunk:  # filter out keep-alive new chunks
                f.write(chunk)
                f.flush()
                
    # load gtfs
    print('Validating GTFS')
    gtfs_factory = GetGtfsFactory()
    accumulator = HTMLCountingProblemAccumulator(limit_per_type=50)
    problem_reporter = ProblemReporter(accumulator)
    loader = gtfs_factory.Loader(GTFS_FILE_NAME, problems=problem_reporter)
    schedule = loader.Load()
    
    # validate gtfs
    schedule.Validate()
    
    # check for trips with a null value for trip_headsign
    for trip in schedule.GetTripList():
        if trip.trip_headsign == 'null':
            problem_reporter.InvalidValue('trip_headsign', 'null', type=TYPE_WARNING)
            
    # write GTFS report to file
    report_name = 'gtfs_validation_{0}.html'.format(datetime.now().strftime('%Y-%m-%d %H.%M'))
    report_filenmae = os.path.join(REPORTS_DIR, report_name)
    with open(report_filenmae, 'w') as f:
        accumulator.WriteOutput(GTFS_FILE_NAME, f, schedule, transitfeed)
        
    print('GTFS validation report written to {0}'.format(report_filenmae))
    
    # post-validation
    gtfs_validated = True
    num_errors = accumulator.ErrorCount()
    if num_errors > 0:
        gtfs_validated = False
        print('{0} errors in GTFS data'.format(num_errors))
        
    num_warnings = accumulator.WarningCount()
    if num_warnings > 0:
        print('{0} warnings about GTFS data'.format(num_warnings))
        
    if 'ExpirationDate' in accumulator.ProblemListMap(TYPE_WARNING).keys():
        start_date, end_date = schedule.GetDateRange()
        last_service_day = datetime(*(time.strptime(end_date, "%Y%m%d")[0:6]))
        if last_service_day < datetime.now():
            print('GTFS Feed has expired.')
            gtfs_validated = False
        
    return gtfs_validated


def update_gtfs(instance_dns_name=None, validate=False):
    '''Update the gtfs file on the EC2 instance and tell OnTransit to load the latest gtfs.
    
    This assumes that OnTransit has been installed on the server.
    
    Args:
        instance_dns_name (string, default=None): The EC2 instance to update the gtfs on.
        validate (boolean, default=True): Whether or not to require a passing validation the GTFS.
    '''
    
    if validate and not validate_gtfs():
        raise Exception('GTFS static file validation Failed.')
        
    fab = get_fab('regular', instance_dns_name)
    fab.update_gtfs()
    
    
def start_server(instance_dns_name=None):
    '''Starts the OnTransit server.
    '''
    
    fab = get_fab('regular', instance_dns_name)
    fab.start_server()
    
    
def stop_server(instance_dns_name=None):
    '''Starts the OnTransit server.
    '''
    
    fab = get_fab('regular', instance_dns_name)
    fab.stop_server()
    
    
def install_cron_scripts(instance_dns_name=None):
    '''Starts the OnTransit server.
    '''
    
    fab = get_fab('regular', instance_dns_name)
    fab.install_ontransit_cron_scripts()
    
    
def master():
    '''A single script to deploy OnTransit in one command to a new EC2 instance
    '''
    
    # dl gtfs and validate it
    '''if not validate_gtfs():
        raise Exception('GTFS Validation Failed')'''
    
    # setup new EC2 instance
    public_dns_name = launch_new()
    #public_dns_name = input('dns_name')
    
    install_dependencies(public_dns_name)
    
    # install OBA
    install_ontransit(public_dns_name)
    
    # update GTFS, make new bundle
    update_gtfs(public_dns_name, False)
    
    # start server
    start_server(public_dns_name)
    
    # install crons
    install_cron_scripts(public_dns_name)
