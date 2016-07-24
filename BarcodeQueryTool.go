package main

import (
	"flag"
	"github.com/RoanBrand/BarcodeQueryTool/api"
	"log"
	"net/http"
)

func main() {
	// Get config
	usageHelpMessage := `You must set the config, e.g. BarcodeQueryTool.exe -config="config.json"`
	mainconfig := flag.String("config", "", usageHelpMessage)
	flag.Parse()

	// Load config
	if *mainconfig == "" {
		log.Fatal(usageHelpMessage)
	}
	conf := &api.AppConfig{}
	err := conf.LoadFromFile(*mainconfig)
	if err != nil {
		log.Fatalf("Error loading %v: %v", *mainconfig, err)
	}

	// Static files for frontend
	fs := http.FileServer(http.Dir("static/"))
	http.Handle("/", fs)

	// Connect to DB
	dbConn := api.New(conf)
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
