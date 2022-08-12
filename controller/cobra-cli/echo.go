package cobracli

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

func NewEcho() *echo {
	echo := echo{}
	echo.initRootCommand()

	return &echo
}

type echo struct {
	flag    string
	rootCmd cobra.Command
}

func (e *echo) Execute() error {
	if err := e.rootCmd.Execute(); err != nil {
		return err
	}

	return nil
}

func (e *echo) handleRoot(cmd *cobra.Command, args []string) error {
	e.rootCmd.SilenceUsage = true
	e.rootCmd.SilenceErrors = true

	fmt.Printf("flag: %v\n", e.flag)
	fmt.Printf("args: %s\n", strings.Join(args, " "))
	return nil
}

func (e *echo) initRootCommand() {
	e.rootCmd = cobra.Command{
		Args:  cobra.MinimumNArgs(1),
		Use:   "echo args...",
		Short: "display args",
		Long:  "Display arguments on stdout.",
		RunE:  e.handleRoot,
	}
	e.rootCmd.PersistentFlags().StringVar(&e.flag, "flag", "", "usage")
	e.rootCmd.MarkPersistentFlagRequired("flag")
}
