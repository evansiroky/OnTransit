''' Copied from http://django-fab-deploy.readthedocs.org/en/0.7.5/_modules/fab_deploy/crontab.html '''
from __future__ import with_statement
from fabric.api import hide, run, settings, puts


__all__ = ['crontab_set', 'crontab_add', 'crontab_show', 'crontab_remove', 'crontab_update']


def _marker(marker):
    return ' # MARKER:%s' % marker if marker else ''


def _get_current():
    with settings(hide('warnings', 'stdout'), warn_only=True):
        output = run('crontab -l')
        return output if output.succeeded else ''


def crontab_set(content):
    """ Sets crontab content """
    run("echo '%s'|crontab -" % content)


def crontab_show():
    """ Shows current crontab """
    puts(_get_current())


def crontab_add(content, marker=None):
    """ Adds line to crontab. Line can be appended with special marker
    comment so it'll be possible to reliably remove or update it later. """
    old_crontab = _get_current()
    crontab_set(old_crontab + '\n' + content + _marker(marker))


def crontab_remove(marker):
    """ Removes a line added and marked using crontab_add. """
    lines = [line for line in _get_current().splitlines()
             if line and not line.endswith(_marker(marker))]
    crontab_set("\n".join(lines))


def crontab_update(content, marker):
    """ Adds or updates a line in crontab. """
    crontab_remove(marker)
    crontab_add(content, marker)
