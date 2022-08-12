package main

import (
	"os"

	cobracli "github.com/mkaiho/aws-batch-sample/controller/cobra-cli"
	"github.com/mkaiho/aws-batch-sample/logging"
)

func init() {
	logging.InitLoggerWithZap()
}

func main() {
	if err := cobracli.NewEcho().Execute(); err != nil {
		os.Exit(1)
	}
}
