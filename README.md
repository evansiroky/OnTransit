# OnTransit

A webapp to crowdsource vehicle arrivals for a transit system.

There are 3 main components to this project:

1.  Web
 - A jQuery Mobile front-end compiled using browserify, jade and stylus.
2.  Server
 - An express.js server utilizing gtfs-sequelize for communicating with a PostGIS database.
3.  Deployer
 - A bunch of python scripts to deploy the server to an EC2 instance (targeted OS: CentOS 6).

## Table of Contents

* [Server](#server)
* [Front End](#front-end)
* [Deployer](#deployer)
  * [Installation](#installation)
  * [EC2 Setup](#ec2-setup)
  * [Config Files](#config-files)
      * [aws.ini](#awsini)
      * [gtfs.ini](#gtfsini)
      * [ontransit.ini](#ontransitini)
  * [Running Scripts](#running-scripts)
  * [EC2 Instance Notes](#ec2-instance-notes)

## Deployer

The deployer part of the project consists of scripts to start a new CentOS 6 instance using Amazon Web Services and then install the OnTransit app.

### Installation

The project is based of off python 2.7, but is best used with the `virtualenv` development scheme.

1. Install Python 2.7
2. Install virtualenv: `$ [sudo] pip install virtualenv`
3. Clone the github project: `$ git clone https://github.com/trilliumtransit/oba_rvtd_deployer.git`
4. Instantiate the virtual python environment for the project using python 2.7: 
  - Windows: `virtualenv --python=C:\Python27\python.exe oba_rvtd_deployer`
  - Linux: `virtualenv -p /path/to/python27 oba_rvtd_deployer`
5. Browse to project folder `cd oba_rvtd_deployer`
6. Activate the virtualenv: 
  - Windows: `.\Scripts\activate`
  - Linux: `bin/activate`
7. (Windows only) Manually install the `pycrypto` library.  The followin command assumes you have 32 bit python 2.7 installed: `pip install http://www.voidspace.org.uk/python/pycrypto-2.6.1/pycrypto-2.6.1-cp27-none-win32.whl`  If 64 bit python 2.7 is installed, run the following command instaed:  `pip install http://www.voidspace.org.uk/python/pycrypto-2.6.1/pycrypto-2.6.1-cp27-none-win_amd64.whl`
8. Install the python project using develop mode: `python setup.py develop`

### EC2 Setup

You will need to do the following for automatically launching Amazon EC2 instances using the scripts:

- Create AWS account
 - Get the access key
 - Get the secret access key
- Create security group
 - Add your IP to list of allowed inbound traffic [(see aws docs)](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/authorizing-access-to-an-instance.html).
- Create key pair [(see aws docs)](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html).
 - Download .pem file to computer
- (Windows only) instally PuTTY and PuTTYgen
 - [Download from here](http://www.chiark.greenend.org.uk/~sgtatham/putty/download.html).
 - Create .ppk file [(see aws docs)](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/putty.html).

### Config Files

You'll need to create a bunch of config files before running the deployment scripts.  Run the script `setup_config` to be prompted for each setting, or create a new folder called `config` and add the files manually.  All config files are .ini files and have a single section called 'DEFAULT'.

#### aws.ini

| Setting Name | Description |
| --- | --- |
| ami_id | The base ami to start from.  Suggested value: `ami-81d092b1` (CentOS 6). |
| aws_access_key_id | Access key for account. |
| aws_secret_access_key | Secret access key for account. |
| block_device_map | The hard drive? to use when creating a volume.  Suggested value: `/dev/sda1`. |
| cron_email | An email address to send cron output to. |
| delete_volumes_on_tear_down | When tearing down instance, also delete volumes.  Volumes are set to auto-delete on instance termination, so you should set this to `false`. |
| elasitc_ip | An elastic IP to use.  This isn't used yet in project. |
| key_filename | The path of your .pem file. |
| key_name | The name of the secret key for the EC2 instance to use. |
| instance_name | The name to tag the instance with. |
| instance_type | The EC2 instance type.  [(See instance types)](http://aws.amazon.com/ec2/pricing/). |
| region | The AWS region to connect to. |
| regular_user_name | Name of user that will get created on CentOS to run app. |
| regular_user_password | Password of user. |
| root_user | The name of the root user.  Suggested value: `root`. |
| security_groups | Security groups to grant to the instance.  If more than one, seperate with commas. |
| timezone | The linux timezone to set the machine to.  Use a path on the machine such as `/usr/share/zoneinfo/America/Los_Angeles`. |
| volume_size | Size of the AWS Volume for the new instance in GB.  | 

#### gtfs.ini

| Setting Name | Description |
| --- | --- |
| gtfs_static_url | The url where the gtfs static file can be found. |

#### ontransit.ini

| Setting Name | Description |
| --- | --- |
| agency_timezone | Timezone to display result on website.  In format `America/Los_Angeles`. |
| database_name | Name of db. |
| google_analytics_tracking_key | Client side Google Analytics Tracking key. |
| google_maps_api_key | Google Maps Javascript Browser API Key |
| ontransit_base_folder | Parent folder.  Usually title of repo. |
| ontransit_git_repo | Git repo to use. |
| pg_worker_username | Username of worker to use to load in gtfs data. |
| pg_worker_password | ... |
| pg_web_username | Username of web user for pg. |
| pg_web_password | ... |

### Running Scripts

If using linux, the executable files to run scripts will be in the `bin` folder instead of `Scripts`.  In the remainder of the docs, whenever it says "run script `script_name`", you'll run the script by doing `bin/script_name` or `.\Scripts\script_name` on linux and windows respectively.

| Script Name | Description |
| --- | --- |
| clean_config | Deletes the "config" folder. |
| setup_config | Helper script to create configuration files for AWS, OnTransit and updating and validating GTFS. |
| launch_new_ec2 | Launches a new Amazon EC2 instance and creates new regular use. |
| install_dependencies | Installs the essential software to run OnTransit. |
| install_ontransit | Installs OnTransit on server by cloning it and then installing with npm. |
| validate_gtfs | Downloads and validates the static GTFS. |
| update_gtfs | Loads new data into PostGIS db. Validate the GTFS before doing this. |
| start_ontransit | Starts OnTransit Server. |
| install_ontransit_crons | Installs various cron jobs to maintain data quality of OnTransit app. |
| stop_ontransit | Stops OnTransit Server. |
| tear_down_ec2 | Terminates an Amazon EC2 instance. |
| deploy_master | Combines following scripts in order: launch_new_ec2, install_dependencies, install_ontransit, update_gtfs, start_ontransit, install_ontransit_crons. |

### EC2 Instance Notes

Here is a complete list of stuff that this script install/does on the instance:

* Launches a new EC2 instance
* Creates new user with sudo privileges
* Updates system using `yum update`.
* Installs wget, unzip
* Installs [AWS Cloudwatch Monitoring Scripts](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/mon-scripts-perl.html). (starts via cron)
* Changes the timezone of the machine.
* Installs PostgreSQL
* Installs PostGIS
* Installs git
* Installs node
* Installs npm
* Muks with iptables to forward port 80 traffic to port 3000.
* Clones this repo.
* Builds the web static files.
* Loads in gtfs data.
* Starts server
* Installs a cron to refresh the data nightly
