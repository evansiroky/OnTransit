import ConfigParser
import os
import shutil

try: 
    input = raw_input
except NameError: 
    pass

from deployer import CONFIG_DIR, CONFIG_TEMPLATE_DIR


class DefaultConfig:
    
    def __init__(self, config_parser):
        self.config_parser = config_parser
        
    def get(self, key):
        return self.config_parser.get('DEFAULT', key)
        

def clean():
    '''Deletes the config folder
    '''
    try:
        shutil.rmtree(CONFIG_DIR)
    except:
        pass
    
    
def setup_all():
    '''Calls the setup of all config Items
    '''
    setup_aws()
    setup_gtfs()
    setup_ontransit()
    
    
def setup(config_type):
    '''Master function for setting up each config type
    '''
    
    # create config dir if not exists
    try:
        os.makedirs(CONFIG_DIR)
    except:
        pass
    
    display_name = dict(aws='Amazon Web Services (AWS)',
                        gtfs='GTFS static and Realtime Feeds',
                        ontransit='OnTransit node.js app')
    
    print('-----------------')
    print('Setting up config for {0}'.format(display_name[config_type]))
    
    conf = dict()
    config_filename = '{0}.ini'.format(config_type)
    
    for line in open(os.path.join(CONFIG_TEMPLATE_DIR, config_filename)):
        if line.find('=') > 0:
            conf_key = line[:line.find('=')].strip()
            conf[conf_key] = input('Please enter {0}: '.format(conf_key))
            
    conf_writer = ConfigParser.ConfigParser()
    for k in conf:
        conf_writer.set('DEFAULT', k, conf[k])
    
    conf_writer.write(open(os.path.join(CONFIG_DIR, config_filename), 'w'))
            

def setup_aws():
    '''Sets up the configuration for Amazon Webservices (AWS)
    '''
    setup('aws')


def setup_gtfs():
    '''Sets up the configuration for GTFS
    '''
    setup('gtfs')


def setup_ontransit():
    '''Sets up the configuration for OnTransit
    '''
    setup('ontransit')
    
    
def get_config(config_type):
    '''Master function for getting a config file
    
    Calls setup if config file not found.
    
    Returns:
        ConfigParsers: the ConfigParser for the config type
    '''
    
    config_filename = '{0}.ini'.format(config_type)
    config_filename = os.path.join(CONFIG_DIR, config_filename)
    if not os.path.exists(config_filename):
        setup(config_type)
        
    config = ConfigParser.ConfigParser()
    config.read(config_filename)
    return DefaultConfig(config)


def get_aws_config():
    '''Gets the AWS settings
    
    Returns:
        ConfigParser: the AWS config
    '''
    return get_config('aws')


def get_gtfs_config():
    '''Gets the GTFS settings
    
    Returns:
        ConfigParser: the GTFS config
    '''
    return get_config('gtfs')


def get_ontransit_config():
    '''Gets the OnTransit settings
    
    Returns:
        ConfigParser: the OnTransit config
    '''
    return get_config('ontransit')
