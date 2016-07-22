package api

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
	"database/sql"
	_ "github.com/denisenkom/go-mssqldb"
	"net/http"
	"encoding/csv"
	"os"
)

type tablerow struct {
	ID          int64
	OSG         sql.NullString
	CTG         sql.NullString
	ANUG        sql.NullString
	PGG         sql.NullString
	DD          sql.NullString
	Codecontent sql.NullString
	Timestamp   string
	Errors      []string
}

func (t *tablerow) stringify() []string {
	var out []string
	out = append(out, strconv.FormatInt(t.ID, 10))
	out = append(out, t.OSG.String)
	out = append(out, t.CTG.String)
	out = append(out, t.ANUG.String)
	out = append(out, t.PGG.String)
	out = append(out, t.DD.String)
	out = append(out, t.Codecontent.String)
	out = append(out, t.Timestamp)
	for _, v := range t.Errors {
		out = append(out, v)
	}

	return out
}

var latestRecordGUID uint64

type api struct {
	db *sql.DB
}

func New(dbServerName *string, dbUserName *string, dbPassword *string) *api {
	a := api{}
	db, err := sql.Open("mssql", "server="+*dbServerName+";user id="+*dbUserName+";password="+*dbPassword)
	checkErr(err)
	a.db = db
	return &a
}

func (a *api) EndGracefully() {
	a.db.Close()
}

func (a *api) DashFunc(w http.ResponseWriter, r *http.Request) {
	queryArgs := r.URL.Query()
	filtered_from, ok1 := queryArgs["from"]
	filtered_to, ok2 := queryArgs["to"]

	var qry string
	if ok1 == true || ok2 == true {
		// Time window
		qry = `SELECT uid, OSG, Codecontent, Scantimestamp, Errors1 FROM AF_HDEP.dbo.Scanlog WHERE (Scantimestamp >= '`
		qry += filtered_from[0][:len(queryArgs["from"][0])-6] + `' AND Scantimestamp <= '` + filtered_to[0][:len(queryArgs["to"][0])-6] + `'`
		if v, ok := queryArgs["errorsOnly"]; ok == true {
			if v[0] == "true" {
				qry += " AND Errors1 != 0"
			}
		}
		qry += `) ORDER BY uid DESC;`
	} else {
		// Only last 10 - for dashboard
		qry = `SELECT TOP 10 uid, OSG, Codecontent, Scantimestamp, Errors1 FROM AF_HDEP.dbo.Scanlog`
		qry += ` ORDER BY uid DESC;`
	}

	rows, err := a.db.Query(qry)
	checkErr(err)
	jsonArr := []tablerow{}
	for rows.Next() {
		var (
			record      tablerow
			qtime       time.Time
			errorNumber sql.NullInt64
		)
		err = rows.Scan(&record.ID, &record.OSG, &record.Codecontent, &qtime, &errorNumber)
		checkErr(err)
		record.OSG.String = strings.TrimSpace(record.OSG.String)
		record.Codecontent.String = strings.TrimSpace(record.Codecontent.String)
		record.Timestamp = qtime.Format("2006-01-02 15:04:05")
		record.Errors = parseError(&errorNumber)
		jsonArr = append(jsonArr, record)
	}

	jsonStr, err := json.Marshal(jsonArr)
	if err == nil {
		fmt.Fprintf(w, "%s", jsonStr)
	} else {
		httpSendError(w, err)
	}
}

func (a *api) QueryFunc(w http.ResponseWriter, r *http.Request) {
	queryArgs := r.URL.Query()
	filtered_from := queryArgs["from"][0][:len(queryArgs["from"][0])-6]
	filtered_to := queryArgs["to"][0][:len(queryArgs["to"][0])-6]

	qry := "SELECT uid, OSG, CTG, ANUG, PGG, DD, Codecontent, Scantimestamp, Errors1 FROM AF_HDEP.dbo.Scanlog "
	qry += `WHERE Scantimestamp >= '` + filtered_from + `' AND Scantimestamp <= '` + filtered_to + `'`

	// Only retrieve records with alarm errors
	if v, ok := queryArgs["errorsOnly"]; ok == true {
		if v[0] == "true" {
			qry += " AND Errors1 != 0;"
		}
	}

	rows, err := a.db.Query(qry)
	checkErr(err)
	jsonArr := []tablerow{}
	for rows.Next() {
		var (
			record      tablerow
			qtime       time.Time
			errorNumber sql.NullInt64
		)
		err = rows.Scan(&record.ID, &record.OSG, &record.CTG, &record.ANUG, &record.PGG, &record.DD, &record.Codecontent, &qtime, &errorNumber)
		checkErr(err)
		record.OSG.String = strings.TrimSpace(record.OSG.String)
		record.CTG.String = strings.TrimSpace(record.CTG.String)
		record.ANUG.String = strings.TrimSpace(record.ANUG.String)
		record.PGG.String = strings.TrimSpace(record.PGG.String)
		record.DD.String = strings.TrimSpace(record.DD.String)
		record.Codecontent.String = strings.TrimSpace(record.Codecontent.String)
		record.Timestamp = qtime.Format("2006-01-02 15:04:05")
		record.Errors = parseError(&errorNumber)
		jsonArr = append(jsonArr, record)
	}

	// This result is meant to be saved to disk as csv
	if v, ok := queryArgs["savetodisk"]; ok == true {
		f, err := os.Create(v[0] + `:\qryresult-` + time.Now().Format("2006-01-02 15.04.05") + ".csv")
		if err != nil {
			httpSendError(w, err)
			return
		}
		defer f.Close()

		writer := csv.NewWriter(f)

		titles := []string{"RecordID", "OSG", "CTG", "ANUG", "PGG", "DD", "Codecontent", "Timestamp", "Errors"}
		writer.Write(titles)
		for _, v := range jsonArr {
			writer.Write(v.stringify())
		}
		writer.Flush()

		err = writer.Error()
		if err != nil {
			httpSendError(w, err)
		} else {
			w.WriteHeader(http.StatusOK)
		}
	} else {
		jsonStr, err := json.Marshal(jsonArr)
		if err == nil {
			fmt.Fprintf(w, "%s", jsonStr)
		} else {
			httpSendError(w, err)
		}
	}

}

func (a *api) ErrorCount(w http.ResponseWriter, r *http.Request) {
	queryArgs := r.URL.Query()
	filtered_from := queryArgs["from"][0][:len(queryArgs["from"][0])-6]
	filtered_to := queryArgs["to"][0][:len(queryArgs["to"][0])-6]

	qry := "SELECT Errors1 FROM AF_HDEP.dbo.Scanlog "
	qry += `WHERE Scantimestamp >= '` + filtered_from + `' AND Scantimestamp <= '` + filtered_to + `'`
	qry += " AND Errors1 != 0;"

	rows, err := a.db.Query(qry)
	checkErr(err)

	errorCounts := make(map[string]int)
	for rows.Next() {
		var errorNumber sql.NullInt64
		err = rows.Scan(&errorNumber)
		checkErr(err)

		errors := parseError(&errorNumber)
		for _, v := range errors {
			errorCounts[v]++
		}
	}

	jsonStr, err := json.Marshal(errorCounts)
	if err == nil {
		fmt.Fprintf(w, "%s", jsonStr)
	} else {
		httpSendError(w, err)
	}
}

func GetLocalDrivelist(w http.ResponseWriter, r *http.Request) {
	driveList := getdrives()

	jsonStr, err := json.Marshal(driveList)
	if err == nil {
		fmt.Fprintf(w, "%s", jsonStr)
	} else {
		httpSendError(w, err)
	}
}

func parseError(errorNumber *sql.NullInt64) (errorMsgs []string) {
	errorMap := [32]string{
		"Barcode overall quality check failed",         // Bit 31?
		"Machining test error, check piston",           // Bit 30?
		"Stopper not up, crank-machining test skipped", // Bit 29?
		"", // Bit 28?
		"", // Bit 27?
		"Product not detected as 471 or 472", // Bit 26?
		"Product not machined",               // Bit 25?
		"Barcode not readable",               // Bit 24?
		"472 ZGS error",                      // Bit 23?
		"472 Height error",                   // Bit 22?
		"472 Length error",                   // Bit 21?
		"471 ZGS error",                      // Bit 20?
		"471 Height error",                   // Bit 19?
		"471 Length error",                   // Bit 18?
		"472 Product number error",           // Bit 17?
		"471 Product number error",           // Bit 16?
		"", // Bit 15?
		"", // Bit 14?
		"", // Bit 13?
		"", // Bit 12?
		"", // Bit 11?
		"", // Bit 10?
		"Barcode content length wrong",               // Bit 9?
		"Unknown character found in Barcode content", // Bit 8?
		"", // Bit 7? - This maps to bit 31 on PLC to indicate an error
		"", // Bit 6?
		"", // Bit 5?
		"", // Bit 4?
		"", // Bit 3?
		"", // Bit 2?
		"", // Bit 1?
		"", // Bit 0?
	}

	var list []string
	errorBitsString := strconv.FormatInt((*errorNumber).Int64, 2) // convert to string of "1" and "0" 's
	prependStr := ""
	for i := 0; i < 32-len(errorBitsString); i++ {
		prependStr += "0"
	}
	errorBitsString = prependStr + errorBitsString
	for i, v := range errorBitsString {
		if v == '1' {
			errorMsg := errorMap[i]
			if errorMsg != "" {
				list = append(list, errorMsg)
			}
		}
	}
	return list
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}

func httpSendError(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusBadRequest)
	fmt.Fprintf(w, "%v", err)
}

func getdrives() (r []string) {
	for _, drive := range "ABCDEFGHIJKLMNOPQRSTUVWXYZ" {
		_, err := os.Open(string(drive) + ":\\")
		if err == nil {
			r = append(r, string(drive))
		}
	}
	return
}
