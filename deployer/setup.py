from setuptools import setup, find_packages
 
setup(
    name='deployer',
    packages=find_packages(),
    install_requires=[
        'requests>=2.5.3',
        'boto>=2.38',
        'fabric>=1.10.1',
        'transitfeed>=1.2.14'
    ],
    entry_points={
        'console_scripts': [
            # config scripts
            'clean_config=deployer.config:clean',
            'setup_config=deployer.config:setup_all',
            
            # aws/ontransit installation
            'launch_new_ec2=deployer.main:launch_new',
            'tear_down_ec2=deployer.main:tear_down',
            'install_dependencies=deployer.main:install_dependencies',
            'install_ontransit=deployer.main:install_ontransit',
            
            # oba/gtfs activation
            'validate_gtfs=deployer.main:validate_gtfs',
            'update_gtfs=deployer.main:update_gtfs',
            'start_ontransit=deployer.main:start',
            
            # one command new deployment
            'deploy_master=deployer.main:master'
        ]
    }
)
