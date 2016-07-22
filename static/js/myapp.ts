/// <reference path="jquery.d.ts" />
/// <reference path="bootstrap.v3.datetimepicker-3.0.0.d.ts" />
/// <reference path="highcharts.d.ts" />

window.onload = () => {
    updateDash();

    $(() => {
        $('#history-fromdate').datetimepicker({
            format: 'DD/MM/YYYY HH:mm'//,
            //showClose: true
        });
        $('#history-todate').datetimepicker({
            useCurrent: false, //Important! See issue #1075
            format: 'DD/MM/YYYY HH:mm'//,
            //showClose: true
        });
        $("#history-fromdate").on("dp.change", (e) => {
            $('#history-todate').data("DateTimePicker").minDate(e.date);
        });
        $("#history-todate").on("dp.change", (e) => {
            $('#history-fromdate').data("DateTimePicker").maxDate(e.date);
        });

        $('#query-fromdate').datetimepicker({
            format: 'DD/MM/YYYY HH:mm'
        });
        $('#query-todate').datetimepicker({
            useCurrent: false, //Important! See issue #1075
            format: 'DD/MM/YYYY HH:mm'
        });
        $("#query-fromdate").on("dp.change", (e) => {
            $('#query-todate').data("DateTimePicker").minDate(e.date);
        });
        $("#query-todate").on("dp.change", (e) => {
            $('#query-fromdate').data("DateTimePicker").maxDate(e.date);
        });

        $('#dropdownClicked').on('show.bs.dropdown', (e) => {
            const dl = $('#drivelist');
            dl.html('<li><h5>LOADING</h5></li>');

            $.getJSON("/getlocaldrivelist", null, (res) => {
                dl.empty();
                for (const drive of res) {
                    const listID = `choose-${drive}`;
                    dl.append(`<li><a href="#" id="${listID}">${drive}:\\ file.csv</li>`);
                    $('#' + listID).on("click", (e) => {
                        const from = $('#query-fromdate').data("DateTimePicker").date();
                        const to = $('#query-todate').data("DateTimePicker").date();
                        $.get("/query", {
                            from: from.format(),
                            to: to.format(),
                            errorsOnly: $("#errorsOnlyQuery").is(":checked"),
                            savetodisk: e.currentTarget.innerText.toString().substr(0, 1)
                        })
                            .done(() => {
                                $("#savetodiskmodal .modal-dialog").html(
                                    `<div class="modal-content">
                                        <div class="modal-header">
                                            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                            <h4 class="modal-title" id="myModalLabel">Success</h4>
                                        </div>
                                        <div class="modal-body">
                                            Saved to Disk
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-primary" data-dismiss="modal">Ok</button>
                                        </div>
                                    </div>`
                                );
                                $('#savetodiskmodal').modal('show');
                            })
                            .fail((e) => {
                                $("#savetodiskmodal .modal-dialog").html(
                                    `<div class="modal-content">
                                        <div class="modal-header">
                                            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                            <h4 class="modal-title" id="myModalLabel">Error Saving file to Disk</h4>
                                        </div>
                                        <div class="modal-body">
                                            ${e.responseText}
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-danger" data-dismiss="modal">Ok</button>
                                        </div>
                                    </div>`
                                );
                                $('#savetodiskmodal').modal('show')
                            });
                    });
                }
            })
                .fail(() => { console.log("Failed to query data"); });

        });

    });

    $("#btn-history").on('click', () => {
        const from = $('#history-fromdate').data("DateTimePicker").date();
        const to = $('#history-todate').data("DateTimePicker").date();
        $("#accordion-history").empty();
        $.getJSON("/retrieve", {from: from.format(), to: to.format(), errorsOnly: $("#errorsOnlyHistory").is(":checked")}, (res) => {
                $("#accordion-history").html(buildAccordion(res, "history"));
        })
            .fail(() => { console.log("Failed to query data"); });
    });

    $("#btn-query").on('click', () => {
        const from = $('#query-fromdate').data("DateTimePicker").date();
        const to = $('#query-todate').data("DateTimePicker").date();
        $("#content-query").empty();
        $.getJSON("/query", {from: from.format(), to: to.format(), errorsOnly: $("#errorsOnlyQuery").is(":checked")}, (res) => {
            let records = "";
            for (const i of res) {
                records += `<tr><td>${i.ID}</td><td>${i.OSG.String}</td><td>${i.CTG.String}</td><td>${i.ANUG.String}</td><td>${i.PGG.String}</td><td>${i.DD.String}</td><td>${i.Codecontent.String}</td><td>${i.Timestamp}</td><td>${i.Errors ? buildErrorlist(i.Errors) : "None"}</td></tr>`;
            }
            $("#content-query").html(records);
            $("#dropdownClicked").removeClass("invisible");
        })
            .fail(() => { console.log("Failed to query data"); });
    });

    $("#activateReports").on("shown.bs.tab", () => {
        const now = moment();
        const to = now.format();
        const from = now.subtract(1, "days").format();

        $("#accordion-history").empty();
        $.getJSON("/errorcount", {from: from, to: to}, (res) => {
            const errorNames = [];
            const errorCounts = [];
            for (const entry in res) {
                errorNames.push(entry);
                errorCounts.push({y: res[entry], color: "#FF6600"});
            }

            $('#graph-container').highcharts({
                chart: {
                    type: 'bar'
                },
                title: {
                    text: 'Fault Occurrence Last 24-Hours '
                },
                xAxis: {
                    categories: errorNames,
                    title: {
                        text: null
                    }
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Fault Count',
                        align: 'high'
                    },
                    labels: {
                        overflow: 'justify'
                    }
                },
                tooltip: {
                    valueSuffix: ' Occurrences'
                },
                plotOptions: {
                    bar: {
                        dataLabels: {
                            enabled: true
                        }
                    }
                },
                series: [{
                    name: 'Last 24 Hours',
                    data: errorCounts,
                    showInLegend: false
                }]
            });
        })
            .fail(() => { console.log("Failed to query data"); });
    });

    $("#activateHistory").on("shown.bs.tab", () => {
        if ($('#history-fromdate').data("DateTimePicker").date() === null) {
            $('#history-fromdate').data("DateTimePicker").date(moment())
        }
    });
    $("#activateQuery").on("shown.bs.tab", () => {
        if ($('#query-fromdate').data("DateTimePicker").date() === null) {
            $('#query-fromdate').data("DateTimePicker").date(moment())
        }
    });
};

const buildAccordion = (records, DOMsalt: string): string => {
    let dom = "";
    let pos = 0;

    for (const i of records) {
        let errorStyle = "";
        if (i.Errors) {
            errorStyle = `style="background-color: #f2dede;"`
        }
        dom +=
            `<div class="panel panel-default">
                <div ` + errorStyle + ` class="panel-heading" role="tab" id="heading-${DOMsalt}-${pos}">
                    <h4 class="panel-title">
                        <div class="row">
                            <div class="col-md-3 ">
                                <a role="button" data-toggle="collapse" data-parent="#accordion" href="#collapse-${DOMsalt}-${pos}" aria-expanded="true" aria-controls="collapse-${DOMsalt}-${pos}">
                                    <span class="glyphicon glyphicon-time"></span><strong> ${i.Timestamp}</strong>
                                </a>
                            </div>
                            <div class="col-md-7 col-md-offset-2">
                                <a role="button" data-toggle="collapse" data-parent="#accordion" href="#collapse-${DOMsalt}-${pos}" aria-expanded="true" aria-controls="collapse-${DOMsalt}-${pos}">
                                    <span class="glyphicon glyphicon-qrcode"></span><strong> ${i.Codecontent.String}</strong>
                                </a>
                            </div>
                        </div>
                    </h4>
                </div>
                <div id="collapse-${DOMsalt}-${pos}" class="panel-collapse collapse" role="tabpanel" aria-labelledby="heading-${DOMsalt}-${pos}">
                    <div class="panel-body">
                        <div class="row">
                            <div class="col-md-2">
                                Record ID: ${i.ID}
                            </div>
                            <div class="col-md-2 col-md-offset-1">
                                Scan OSG: ${i.OSG.String}
                            </div>
                            <div class="col-md-6 col-md-offset-1">
                                Errors: ${i.Errors ? buildErrorlist(i.Errors) : "None"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        pos++;
    }
    return dom;
};

const buildErrorlist = (errors): string => {
    let list = "<ol>";
    for (const error of errors) {
        list += `<li>${error}</li>`;
    }
    list += "</ol>";
    return list;
};

let lastID = 0;
const updateDash = () => {
    $.getJSON("/retrieve", (data) => {
        if (data[0].ID == lastID) {
            return;
        }
        lastID = data[0].ID;
        $("#accordion-dash").html(buildAccordion(data, "dash"));
    })
        .fail(() => { console.log("DB query failed"); });
};
setInterval(updateDash, 1000);
