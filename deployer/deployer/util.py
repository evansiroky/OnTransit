import os
import sys

from deployer import DATA_DIR, REPORTS_DIR, CONFIG_DIR, CONFIG_TEMPLATE_DIR


class FabLogger():
    '''Copied from http://stackoverflow.com/questions/4675728/redirect-stdout-to-a-file-in-python
    '''
    
    def __init__(self, filename=os.path.join(REPORTS_DIR, 'fab.log')):
        self.terminal = sys.stdout

        if not os.path.exists(DATA_DIR):
            os.mkdir(DATA_DIR)
        
        if not os.path.exists(REPORTS_DIR):
            os.mkdir(REPORTS_DIR)
        
        self.log = open(filename, 'w')
        
    def __getattr__(self, attr): 
        return getattr(self.terminal, attr)

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
        

def unix_path_join(*args):
    return '/'.join(args)


def write_template(params, in_filename, out_filename=None):
    
    if out_filename is None:
        out_filename = in_filename
        
    with open(os.path.join(CONFIG_TEMPLATE_DIR, in_filename)) as f:
        template = f.read()
            
    out_file = os.path.join(CONFIG_DIR, out_filename)
    with open(out_file, 'wb') as f:
        f.write(template.format(**params))
        
    return out_file
