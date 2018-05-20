/*jshint esversion: 6 */
/*jslint node: true */

(function (exports, $) {
    "use strict";
    $(document).ready(function () {

        let $window = $(window).on('resize', function () {
                centerModal();
            }),
            $document = $(document).ajaxStart(function () {
                if (showSpinner) {
                    $searchSpinner.addClass('is-active').show();
                }
                $btnSubmit.attr('disabled', true);
            }).ajaxError(function (event, jqxhr, settings, thrownError) {
                $searchSpinner.hide().removeClass('is-active');
                $btnSubmit.attr('disabled', false);
            }).ajaxStop(function () {
                $searchSpinner.hide().removeClass('is-active');
                $btnSubmit.attr('disabled', false);
            }),

            charcode_a = 97,
            charcode_z = 122,
            showSpinner = true,
            lastTouchedStartTime = new Date().getTime(),
            snackbarContainer = document.querySelector('#wfToast'),
            sidebarWidth = 240,
            backend = 0,
            backends = ["PHP", "Go", "Node", "Python"],

            $searchSpinner = $("#searchSpinner"),
            $tray = $("#tray"),
            $title = $('.mdl-layout-title'),
            $resultsArea = $('#resultsArea'),
            $btnSubmit = $('#btnSubmit'),

            $defModal = $('#defModal').on('show.bs.modal', function () {
                centerModal();
            }),
            $defModalTitle = $('#defModalTitle', $defModal),
            $defModalBody = $('.modal-body', $defModal),

            $labelClear = $("#labelClear").click(function () {
                $tray.val('');
            }),

            $backend_switcher = $("input[name='backendoptions']").change(function () {
                backend = parseInt($(this).val());
                $title.text(backends[backend] + 'WordFinder');
                $resultsArea.text('');
            }),

            $formSearch = $("#formSearch").submit(function (event) {
                event.preventDefault();

                let $traytext = $tray.val().trim().toLowerCase();
                if ($traytext.length === 0) {
                    $tray.val('');
                    return false;
                }

                let oInput = validateInput($traytext);
                $tray.val(oInput.tray);

                if (oInput.errmsg.length > 0) {
                    snackbarContainer.MaterialSnackbar.showSnackbar({message: oInput.errmsg});
                    return false;
                }

                $resultsArea.text('');
                $tray.blur();

                let return_type = $('input[name=resultoptions]:checked').val(),
                    startTime = new Date();
                $.ajax({
                    type: 'GET',
                    cache: false,
                    url: '/find',
                    data: {tray: oInput.letters_only, sm: 0, rt: return_type, wc: oInput.wild_count}
                }).done(function (data, textStatus, jqXHR) {
                    if (return_type === 'html') {
                        $resultsArea.html(data);
                        setTimeout(function () {
                            let endTime1 = new Date(),
                                timeDiff1 = (endTime1 - startTime) / 1000,
                                seconds1 = Math.round((timeDiff1 % 60) * 100) / 100;
                            $('#results_footer', $resultsArea).append('<br />Total time: ' + seconds1 + ' secs.');
                        }, 1);
                    } else {
                        let wordlist, total = 0,
                            res = '<h5 id="resultsFor">Results for <span>' + oInput.tray + '</span></h5>';

                        if (data.length === 0) {
                            res += '<p class="noresults">No words found.</p>';
                        }

                        for (let i = 0; i < data.length; i++) {
                            wordlist = data[i];
                            if (wordlist.length === 0) {
                                continue;
                            }
                            res += '<p>' + wordlist[0].length + ' Letter Words</p><div class="wordcontainer">';
                            for (let j = 0, k = wordlist.length; j < k; j++) {
                                res += '<div>' + wordlist[j] + '</div>';
                                total++;
                            }
                            res += '</div>';
                        }
                        $resultsArea.html(res);
                        setTimeout(function () {
                            let endTime2 = new Date(),
                                timeDiff2 = (endTime2 - startTime) / 1000,
                                seconds2 = Math.round((timeDiff2 % 60) * 100) / 100;
                            $resultsArea.append('<p id="results_footer">' + total + ' results in ' + seconds2 + ' secs.</p>');
                        }, 1);
                    }
                });
            }),

            definitionSearch1 = $document.on('click', '#resultsArea .wordcontainer div', function (e) {
                showWordDefModal(this.innerHTML);
            }),
            definitionSearch2 = $document.on('touchstart', '#resultsArea .wordcontainer div', function (e) {
                lastTouchedStartTime = new Date().getTime();
            }).on('touchend', '#resultsArea .wordcontainer div', function (e) {
                let diff = new Date().getTime() - lastTouchedStartTime;
                if (diff > 350) {
                    e.stopPropagation();
                    e.preventDefault();
                    showWordDefModal(this.innerHTML);
                }
            });

        function showWordDefModal(word) {
            $defModalTitle.text(word);
            showSpinner = false;
            $.ajax({
                type: 'GET',
                url: 'https://phpwordfinder.erictotten.org/define/' + word,
                dataType: 'html'
            }).done(function (data, textStatus, jqXHR) {
                $defModalBody.html(data);
                $defModal.modal('show');
                showSpinner = true;
            });
        }

        function validateInput($traytext) {
            let charcode = 0,
                result = {
                    tray: '',
                    letters_only: '',
                    wild_count: 0,
                    errmsg: ''
                };

            for (let i = 0, j = $traytext.length; i < j; i++) {
                if ($traytext[i] === '?') {
                    result.wild_count++;
                } else {
                    charcode = $traytext.charCodeAt(i);
                    if ((charcode >= charcode_a) && (charcode <= charcode_z)) {
                        result.letters_only += $traytext[i];
                    }
                }
            }

            result.tray = result.letters_only;
            for (let i = 0; i < result.wild_count; i++) {
                result.tray += '?';
            }
            if (result.tray.length < 2) {
                result.errmsg = 'At least two characters are required.';
            }
            return result;
        }

        function centerModal() {
            let $dialog = $defModal.find('.modal-dialog'),
                winWidth = $window.width(),
                dWidth = $dialog.width();

            $dialog.css("margin-top", Math.max(0, ($window.height() - $dialog.height()) / 4));
            if (winWidth > 1024) {
                $dialog.css("margin-left", (winWidth / 2) - (dWidth / 2) + sidebarWidth / 2);
            } else if (winWidth > 767) {
                $dialog.css("margin-left", (winWidth / 2) - (dWidth / 2));
            } else {
                $dialog.css("margin-left", $dialog.css("margin-right"));
            }
        }

        $searchSpinner.hide();
        $tray.focus();

    });
}(this, jQuery));
