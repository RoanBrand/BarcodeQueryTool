package main

import (
	"flag"
	"github.com/RoanBrand/BarcodeQueryTool/api"
	"github.com/kardianos/osext"
	"github.com/kardianos/service"
	"log"
	"net/http"
)

type app struct {
	conf     *api.AppConfig
	execPath string
}

func (p *app) Start(s service.Service) error {
	go p.run()
	return nil
}
func (p *app) run() {
	// Static files for frontend
	fs := http.FileServer(http.Dir(p.execPath + "\\static"))
	http.Handle("/", fs)

	// Connect to DB
	dbConn := api.New(p.conf)
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

func (p *app) Stop(s service.Service) error {
	return nil
}

func main() {
	usageHelpMessage := `You must set the config, e.g. BarcodeQueryTool.exe -config="config.json"`

	// Get flags
	svcFlag := flag.String("service", "", "Control the system service.")
	mainconfig := flag.String("config", "", usageHelpMessage)
	flag.Parse()

	svcConfig := &service.Config{
		Name:        "Barcode Query Tool",
		DisplayName: "BarcodeQueryTool",
		Description: "Back-end for BarcodeQueryTool in Siemens WinCC",
		Arguments:   []string{"-config=" + *mainconfig},
	}
	newApp := &app{}
	s, err := service.New(newApp, svcConfig)
	if err != nil {
		log.Fatal(err)
	}

	if *svcFlag != "" {
		err = service.Control(s, *svcFlag)
		if err != nil {
			log.Printf("Valid actions: %q\n", service.ControlAction)
			log.Fatal(err)
		}
		return
	}

	newApp.execPath, err = osext.ExecutableFolder()
	if err != nil {
		log.Fatalf("Error finding program executable path: %v", err)
	}

	// Load config
	if *mainconfig == "" {
		log.Fatal(usageHelpMessage)
	}
	newApp.conf = &api.AppConfig{}
	err = newApp.conf.LoadFromFile(newApp.execPath + "\\" + *mainconfig)
	if err != nil {
		log.Fatalf("Error loading %v: %v", *mainconfig, err)
	}

	err = s.Run()
	if err != nil {
		log.Fatal(err)
	}
}
