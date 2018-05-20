/*jshint esversion: 6 */
/*jslint node: true */

"use strict";

const fs = require('fs'),
    bits = require('./bits'),
    ASCII_a = 97,
    ASCII_z = 122;

//---------------------------------------------------------------------------
exports.createdd = function (req, res) {
    fs.readFile(__dirname + '/wordlists/trie.json', {encoding: 'utf-8'}, function (err, file_data) {
        try {

            let data = JSON.parse(file_data),
                trie = new bits.FrozenTrie(data.trie, data.directory, data.nodeCount),
                words = [], all_words = [], i, j, str = '', lastlen = 0;

            for (i = ASCII_a; i <= ASCII_z; i++) {
                words = trie.getPossibilities(String.fromCharCode(i), 50000);
                for (j = 0; j < words.length; j++) {
                    all_words.push(words[j].trim());
                }
            }

            all_words.sort(function (a, b) {
                return a.length - b.length || a.localeCompare(b);
            });

            for (i = 0, j = all_words.length; i < j; i++) {
                if (lastlen !== all_words[i].length) {
                    if (str.length > 0) {
                        fs.writeFile(__dirname + '/wordlists/wl_' + lastlen + '.txt', str, function (err) {
                            if (err) {
                                return console.log(err);
                            }
                            console.log('File saved');
                        });

                    }
                    str = '';
                    lastlen = all_words[i].length;
                }
                str += all_words[i] + '*';
            }

        } catch (e) {
            console.log('cannot create trie: ' + e);
        }
        res.send('files created');
    })
};
