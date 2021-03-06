/*jshint esversion: 6 */
/*jslint node: true */

"use strict";

let fs = require('fs'),
    memjs = require('memjs'),
    mc = memjs.Client.create(process.env.MEMCACHIER_SERVERS),
    NUM_WORDLIST_FILES = 24,
    ASCII_a = 97,
    ASCII_z = 122;

/////
function WordList(ana_key_len, letter_counts_arr, wild_count, data_str, cached) {
    this.ana_key_len = ana_key_len;
    this.letter_counts_arr = letter_counts_arr;
    this.wild_count = wild_count;
    this.words_arr = data_str.toString().split('*');
    this.num_found = this.words_arr.length;
    this.num_searches = 0;
    this.cached = cached;
}

/////
WordList.prototype.nullifyWordsNotMatched = function () {
    let j = 0, idx = 0,
        local_letter_counts_arr = [];

    for (let i = 0; i < this.words_arr.length; i++) {
        local_letter_counts_arr = this.letter_counts_arr.slice(0, this.letter_counts_arr.length);
        for (j = 0; j < this.ana_key_len; j++) {
            idx = this.words_arr[i].charCodeAt(j) - ASCII_a;
            this.num_searches++;
            if (local_letter_counts_arr[idx] === 0) {
                this.words_arr[i] = null;
                this.num_found--;
                break;
            }
            local_letter_counts_arr[idx] -= 1;
        }
    }
};

/////
WordList.prototype.nullifyWordsNotMatchedWild = function () {
    let j = 0, idx = 0, wild_avail = 0,
        local_letter_counts_arr = [];

    for (let i = 0; i < this.words_arr.length; i++) {
        local_letter_counts_arr = this.letter_counts_arr.slice(0, this.letter_counts_arr.length);
        wild_avail = this.wild_count;
        for (j = 0; j < this.ana_key_len; j++) {
            idx = this.words_arr[i].charCodeAt(j) - ASCII_a;
            this.num_searches++;
            if (local_letter_counts_arr[idx] === 0) {
                if (wild_avail === 0) {
                    this.words_arr[i] = null;
                    this.num_found--;
                    break;
                } else {
                    wild_avail--;
                }
            } else {
                local_letter_counts_arr[idx] -= 1;
            }
        }
    }
};


/////
function outputJSON(arr_results_arr, res) {
    let json_arr = [], temp_arr = [];
    for (let i = 0, j = arr_results_arr.length; i < j; i++) {
        temp_arr = [];
        for (let m = 0, n = arr_results_arr[i].words_arr.length; m < n; m++) {
            if (arr_results_arr[i].words_arr[m]) {
                temp_arr.push(arr_results_arr[i].words_arr[m]);
            }
        }
        if (temp_arr.length > 0) {
            json_arr.push(temp_arr);
        }
    }
    res.json(json_arr);
}

/////
function genHTML(word_len, words_arr) {
    let html = '<p>' + word_len + ' Letter Words</p><div class="wordcontainer">';
    for (let i = 0, j = words_arr.length; i < j; i++) {
        if (words_arr[i]) {
            html += '<div>' + words_arr[i] + '</div>';
        }
    }
    return html + '</div>';
}

/////
function outputHTML(newtray, arr_results_arr, render_start_time, res) {
    let total_found = 0, total_searches = 0, total_cached = 0,
        html = '<h5 id="resultsFor">Results for <span>' + newtray + '</span></h5>';

    for (let i = 0, j = arr_results_arr.length; i < j; i++) {
        if (arr_results_arr[i].num_found > 0) {
            html += genHTML(arr_results_arr[i].ana_key_len, arr_results_arr[i].words_arr);
            total_found += arr_results_arr[i].num_found;
            total_searches += arr_results_arr[i].num_searches;
            total_cached += arr_results_arr[i].cached;
        }
    }

    if (total_found === 0) {
        html = '<p class="noresults">No words found.</p>';
    }

    html += '<p id="results_footer">';

    html += 'Compares: ' + total_searches + '. Results: ' + total_found + ' in ' + ((new Date().getTime() - render_start_time) / 1000) + 's.';
    html += ' Cached: ' + total_cached;//version
    html += '</p>';

    res.send(html);
}

/////
function createFilePromise(ana_key_len, letter_counts_arr, wild_count) {
    return new Promise(function (resolve, reject) {

            mc.get('wl_' + ana_key_len, function (err, data_from_cache) {
                // mc.close();

                if (err || !data_from_cache) {

                    fs.readFile(__dirname + '/wordlists/wl_' + ana_key_len + '.txt', {encoding: 'utf-8'}, function (err, data_from_file) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        let o_result = new WordList(ana_key_len, letter_counts_arr, wild_count, data_from_file, 0);

                        mc.set('wl_' + ana_key_len, data_from_file, {expires: 0}, function (err, val) {
                            if (err != null) {
                                console.log('Error setting value: ' + err)
                            }
                        });

                        if (wild_count === 0) {
                            o_result.nullifyWordsNotMatched();
                        } else if (wild_count < ana_key_len) {
                            o_result.nullifyWordsNotMatchedWild();
                        }
                        resolve(o_result);
                    });

                } else {
                    let o_result = new WordList(ana_key_len, letter_counts_arr, wild_count, data_from_cache, 1);
                    if (wild_count === 0) {
                        o_result.nullifyWordsNotMatched();
                    } else if (wild_count < ana_key_len) {
                        o_result.nullifyWordsNotMatchedWild();
                    }
                    resolve(o_result);
                }
            });
        }
    );
}

exports.cacheflush = function (req, res) {
    mc.flush(function (e) {
        res.send('flushed');
    });
};

/////
exports.results = function (req, res) {
    let tray = '', newtray = '', return_type = 'html', charcode = 0, ana_key_len = 0,
        i = 0, j = 0, wc = 0, sm = 8, len_letters = 0,
        promises_arr = [], letter_counts_arr = [];

    if (req.query.tray) {
        tray = req.query.tray.trim().toLowerCase();
    }

    for (i = 0, j = 26; i < j; i++) {
        letter_counts_arr[i] = 0;
    }

    for (i = 0, j = tray.length; i < j; i++) {
        charcode = tray.charCodeAt(i);
        if ((charcode >= ASCII_a) && (charcode <= ASCII_z)) {
            letter_counts_arr[charcode - ASCII_a]++;
            newtray += tray[i];
            len_letters++;
        }
    }

    if (req.query.wc) {
        wc = parseInt(req.query.wc);
        if (wc < 0) {
            wc = 0;
        }
    }

    ana_key_len = len_letters + wc;
    if (ana_key_len < 2) {
        res.send('Format: http://nodewordfinder.herokuapp.com/find?tray=test&wc=[0+]&rt=[html,json]');
        return;
    }

    for (i = 0; i < wc; i++) {
        newtray += '?';
    }

    // if (req.query.sm) //8=files 9=sql 10=cache 11=mongo
    // 	sm = parseInt(req.query.sm);
    if (req.query.rt) { //html or json
        return_type = req.query.rt;
    }

    let render_start_time = new Date().getTime();

    if (ana_key_len > NUM_WORDLIST_FILES) {
        ana_key_len = NUM_WORDLIST_FILES;
    }

    for (ana_key_len; ana_key_len > 1; ana_key_len--) {
        switch (sm) {
            case  8:
                promises_arr.push(createFilePromise(ana_key_len, letter_counts_arr, wc));
                break;
            // case  9: promises_arr.push( createSQLPromise(ana_key_len,letter_counts_arr,wc,res.mysql_pool) ); break;
            // case 10: promises_arr.push( createMemcachePromise(ana_key_len,letter_counts_arr,wc) ); break;
            // case 11: promises_arr.push( createMongoPromise(ana_key_len,letter_counts_arr,wc,res.mongodb) ); break;
        }
    }

    Promise.all(promises_arr).then(function (arr_results_arr) {
        // switch (sm) {
        //     case  8:
        //         break;
        // case  9: res.mysql_pool.release(); break;
        // case 10: break; //res.mc_conn.close(); break;
        // case 11: res.mongodb.close(); break;
        // }

        if (return_type === 'json') {
            outputJSON(arr_results_arr, res);
        } else {
            outputHTML(newtray, arr_results_arr, render_start_time, res);
        }

    }).catch(function (reason) {
        console.log(reason);
        if (return_type === 'json') {
            res.json(reason.toString());
        } else {
            res.send(reason.toString());
        }
    });
};