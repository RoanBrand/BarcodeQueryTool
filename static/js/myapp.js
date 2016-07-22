/// <reference path="jquery.d.ts" />
/// <reference path="bootstrap.v3.datetimepicker-3.0.0.d.ts" />
/// <reference path="highcharts.d.ts" />
window.onload = function () {
    updateDash();
    $(function () {
        $('#history-fromdate').datetimepicker({
            format: 'DD/MM/YYYY HH:mm' //,
        });
        $('#history-todate').datetimepicker({
            useCurrent: false,
            format: 'DD/MM/YYYY HH:mm' //,
        });
        $("#history-fromdate").on("dp.change", function (e) {
            $('#history-todate').data("DateTimePicker").minDate(e.date);
        });
        $("#history-todate").on("dp.change", function (e) {
            $('#history-fromdate').data("DateTimePicker").maxDate(e.date);
        });
        $('#query-fromdate').datetimepicker({
            format: 'DD/MM/YYYY HH:mm'
        });
        $('#query-todate').datetimepicker({
            useCurrent: false,
            format: 'DD/MM/YYYY HH:mm'
        });
        $("#query-fromdate").on("dp.change", function (e) {
            $('#query-todate').data("DateTimePicker").minDate(e.date);
        });
        $("#query-todate").on("dp.change", function (e) {
            $('#query-fromdate').data("DateTimePicker").maxDate(e.date);
        });
        $('#dropdownClicked').on('show.bs.dropdown', function (e) {
            var dl = $('#drivelist');
            dl.html('<li><h5>LOADING</h5></li>');
            $.getJSON("/getlocaldrivelist", null, function (res) {
                dl.empty();
                for (var _i = 0, res_1 = res; _i < res_1.length; _i++) {
                    var drive = res_1[_i];
                    var listID = "choose-" + drive;
                    dl.append("<li><a href=\"#\" id=\"" + listID + "\">" + drive + ":\\ file.csv</li>");
                    $('#' + listID).on("click", function (e) {
                        var from = $('#query-fromdate').data("DateTimePicker").date();
                        var to = $('#query-todate').data("DateTimePicker").date();
                        $.get("/query", {
                            from: from.format(),
                            to: to.format(),
                            errorsOnly: $("#errorsOnlyQuery").is(":checked"),
                            savetodisk: e.currentTarget.innerText.toString().substr(0, 1)
                        })
                            .done(function () {
                            $("#savetodiskmodal .modal-dialog").html("<div class=\"modal-content\">\n                                        <div class=\"modal-header\">\n                                            <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button>\n                                            <h4 class=\"modal-title\" id=\"myModalLabel\">Success</h4>\n                                        </div>\n                                        <div class=\"modal-body\">\n                                            Saved to Disk\n                                        </div>\n                                        <div class=\"modal-footer\">\n                                            <button type=\"button\" class=\"btn btn-primary\" data-dismiss=\"modal\">Ok</button>\n                                        </div>\n                                    </div>");
                            $('#savetodiskmodal').modal('show');
                        })
                            .fail(function (e) {
                            $("#savetodiskmodal .modal-dialog").html("<div class=\"modal-content\">\n                                        <div class=\"modal-header\">\n                                            <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-label=\"Close\"><span aria-hidden=\"true\">&times;</span></button>\n                                            <h4 class=\"modal-title\" id=\"myModalLabel\">Error Saving file to Disk</h4>\n                                        </div>\n                                        <div class=\"modal-body\">\n                                            " + e.responseText + "\n                                        </div>\n                                        <div class=\"modal-footer\">\n                                            <button type=\"button\" class=\"btn btn-danger\" data-dismiss=\"modal\">Ok</button>\n                                        </div>\n                                    </div>");
                            $('#savetodiskmodal').modal('show');
                        });
                    });
                }
            })
                .fail(function () { console.log("Failed to query data"); });
        });
    });
    $("#btn-history").on('click', function () {
        var from = $('#history-fromdate').data("DateTimePicker").date();
        var to = $('#history-todate').data("DateTimePicker").date();
        $("#accordion-history").empty();
        $.getJSON("/retrieve", { from: from.format(), to: to.format(), errorsOnly: $("#errorsOnlyHistory").is(":checked") }, function (res) {
            $("#accordion-history").html(buildAccordion(res, "history"));
        })
            .fail(function () { console.log("Failed to query data"); });
    });
    $("#btn-query").on('click', function () {
        var from = $('#query-fromdate').data("DateTimePicker").date();
        var to = $('#query-todate').data("DateTimePicker").date();
        $("#content-query").empty();
        $.getJSON("/query", { from: from.format(), to: to.format(), errorsOnly: $("#errorsOnlyQuery").is(":checked") }, function (res) {
            var records = "";
            for (var _i = 0, res_2 = res; _i < res_2.length; _i++) {
                var i = res_2[_i];
                records += "<tr><td>" + i.ID + "</td><td>" + i.OSG.String + "</td><td>" + i.CTG.String + "</td><td>" + i.ANUG.String + "</td><td>" + i.PGG.String + "</td><td>" + i.DD.String + "</td><td>" + i.Codecontent.String + "</td><td>" + i.Timestamp + "</td><td>" + (i.Errors ? buildErrorlist(i.Errors) : "None") + "</td></tr>";
            }
            $("#content-query").html(records);
            $("#dropdownClicked").removeClass("invisible");
        })
            .fail(function () { console.log("Failed to query data"); });
    });
    $("#activateReports").on("shown.bs.tab", function () {
        var now = moment();
        var to = now.format();
        var from = now.subtract(1, "days").format();
        $("#accordion-history").empty();
        $.getJSON("/errorcount", { from: from, to: to }, function (res) {
            var errorNames = [];
            var errorCounts = [];
            for (var entry in res) {
                errorNames.push(entry);
                errorCounts.push({ y: res[entry], color: "#FF6600" });
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
            .fail(function () { console.log("Failed to query data"); });
    });
    $("#activateHistory").on("shown.bs.tab", function () {
        if ($('#history-fromdate').data("DateTimePicker").date() === null) {
            $('#history-fromdate').data("DateTimePicker").date(moment());
        }
    });
    $("#activateQuery").on("shown.bs.tab", function () {
        if ($('#query-fromdate').data("DateTimePicker").date() === null) {
            $('#query-fromdate').data("DateTimePicker").date(moment());
        }
    });
};
var buildAccordion = function (records, DOMsalt) {
    var dom = "";
    var pos = 0;
    for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
        var i = records_1[_i];
        var errorStyle = "";
        if (i.Errors) {
            errorStyle = "style=\"background-color: #f2dede;\"";
        }
        dom +=
            "<div class=\"panel panel-default\">\n                <div " + errorStyle + (" class=\"panel-heading\" role=\"tab\" id=\"heading-" + DOMsalt + "-" + pos + "\">\n                    <h4 class=\"panel-title\">\n                        <div class=\"row\">\n                            <div class=\"col-md-3 \">\n                                <a role=\"button\" data-toggle=\"collapse\" data-parent=\"#accordion\" href=\"#collapse-" + DOMsalt + "-" + pos + "\" aria-expanded=\"true\" aria-controls=\"collapse-" + DOMsalt + "-" + pos + "\">\n                                    <span class=\"glyphicon glyphicon-time\"></span><strong> " + i.Timestamp + "</strong>\n                                </a>\n                            </div>\n                            <div class=\"col-md-7 col-md-offset-2\">\n                                <a role=\"button\" data-toggle=\"collapse\" data-parent=\"#accordion\" href=\"#collapse-" + DOMsalt + "-" + pos + "\" aria-expanded=\"true\" aria-controls=\"collapse-" + DOMsalt + "-" + pos + "\">\n                                    <span class=\"glyphicon glyphicon-qrcode\"></span><strong> " + i.Codecontent.String + "</strong>\n                                </a>\n                            </div>\n                        </div>\n                    </h4>\n                </div>\n                <div id=\"collapse-" + DOMsalt + "-" + pos + "\" class=\"panel-collapse collapse\" role=\"tabpanel\" aria-labelledby=\"heading-" + DOMsalt + "-" + pos + "\">\n                    <div class=\"panel-body\">\n                        <div class=\"row\">\n                            <div class=\"col-md-2\">\n                                Record ID: " + i.ID + "\n                            </div>\n                            <div class=\"col-md-2 col-md-offset-1\">\n                                Scan OSG: " + i.OSG.String + "\n                            </div>\n                            <div class=\"col-md-6 col-md-offset-1\">\n                                Errors: " + (i.Errors ? buildErrorlist(i.Errors) : "None") + "\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            </div>");
        pos++;
    }
    return dom;
};
var buildErrorlist = function (errors) {
    var list = "<ol>";
    for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
        var error = errors_1[_i];
        list += "<li>" + error + "</li>";
    }
    list += "</ol>";
    return list;
};
var lastID = 0;
var updateDash = function () {
    $.getJSON("/retrieve", function (data) {
        if (data[0].ID == lastID) {
            return;
        }
        lastID = data[0].ID;
        $("#accordion-dash").html(buildAccordion(data, "dash"));
    })
        .fail(function () { console.log("DB query failed"); });
};
setInterval(updateDash, 1000);
//# sourceMappingURL=myapp.js.map