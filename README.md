# BarcodeQueryTool
A Front-end for querying/reporting/exporting live production data

### Howto Build
`go build BarcodeQueryTool.go`

### Run in a terminal
`BarcodeQueryTool.exe -config="config.json"`

---

### Run as a service

#### To Install:
- Copy executable and dependencies to folder where it will live.
- Open terminal in that folder:
- `BarcodeQueryTool.exe -service install -config="config.json"`
- `BarcodeQueryTool.exe -service start`

#### To Start:
`BarcodeQueryTool.exe -service start`

#### To Stop:
`BarcodeQueryTool.exe -service stop`

#### To Remove:
`BarcodeQueryTool.exe -service uninstall`
