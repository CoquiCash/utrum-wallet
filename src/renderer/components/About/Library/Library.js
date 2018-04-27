/** ***************************************************************************
 * Copyright © 2018 Monaize Singapore PTE. LTD.                               *
 *                                                                            *
 * See the AUTHORS, and LICENSE files at the top-level directory of this      *
 * distribution for the individual copyright holder information and the       *
 * developer policies on copyright and licensing.                             *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * Monaize Singapore PTE. LTD software, including this file may be copied,    *
 * modified, propagated or distributed except according to the terms          *
 * contained in the LICENSE file                                              *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/
import * as _ from 'lodash';

const checker = require('license-checker');
const path = require('path');
const fs = require('fs');
const electron = require('electron');

const checkValueExist = (value) => {
  if (value) {
    return value;
  }
  return '';
};

export default {
  name: 'library',
  data() {
    return {
      licenses: [],
    };
  },
  methods: {
    getLicenseString(index) {
      return this.licenses.indexOf(index).licenseString;
    },
    getPublicher(license) {
      return checkValueExist(license.publisher);
    },
    getLicenses(license) {
      return checkValueExist(license.licenses);
    },
    getRepository(license) {
      return checkValueExist(license.repository);
    },
    openLink: (event) => {
      event.preventDefault();
      const link = event.target.href;
      electron.shell.openExternal(link);
    },
    formatEmail(license) {
      if (license.email) {
        return `(${license.email})`;
      }
      return '';
    },
  },
  computed: {
    isLicensesFilled() {
      return !(_.isEmpty(this.licenses));
    },
  },
  mounted() {
    checker.init({
      start: path.join(__dirname, '../../../../../'),
    }, (err, json) => {
      const result = Object.keys(json).map((key) => {
        json[key].name = key;
        return json[key];
      });

      this.licenses = _.forEach(result, (item) => {
        if (item.licenseFile) {
          item.licenseString = fs.readFileSync(item.licenseFile, 'utf8');
        }
      });
    });
  },
};