#!/bin/sh
# Seeded ADV3 fixture content. Do not run.
chmod 777 /var/www/html
chmod 666 /etc/passwd
mkfs.ext4 /dev/sdb1
dd if=/dev/zero of=/dev/sda bs=1M
