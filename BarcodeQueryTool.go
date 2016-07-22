package main

import (
	"flag"
	"log"
	"net/http"
	"github.com/RoanBrand/BootstrapServer/api"
)

func main() {
	// Get Database login information
	serverName := flag.String("server", "localhost\\WINCCPLUSMIG2008", "Specify DB Server IP-Hostname")
	dbUser := flag.String("user", "", "Specify MS SQL Server Username")
	dbPass := flag.String("pass", "", "Specify MS SQL Server Password")
	flag.Parse()

	// Static files for frontend
	fs := http.FileServer(http.Dir("static/"))
	http.Handle("/", fs)

	// Connect to DB
	dbConn := api.New(serverName, dbUser, dbPass)
	defer dbConn.EndGracefully()

	// Api calls
	http.HandleFunc("/retrieve", dbConn.DashFunc)
	http.HandleFunc("/query", dbConn.QueryFunc)
	http.HandleFunc("/errorcount", dbConn.ErrorCount)
	http.HandleFunc("/getlocaldrivelist", api.GetLocalDrivelist)

	// Launch web server
	log.Println("Starting HTTP Server")
	log.Fatal(http.ListenAndServe(":80", nil))
}


