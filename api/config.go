package api

import (
	"encoding/json"
	"io/ioutil"
)

type AppConfig struct {
	DbServerAddress string
	DbUser          string
	DbPass          string
}

func (c *AppConfig) LoadFromFile(filename string) error {
	fileContents, err := ioutil.ReadFile(filename)
	if err != nil {
		return err
	}

	err = json.Unmarshal(fileContents, c)
	if err != nil {
		return err
	}

	return nil
}
