package logging

import (
	"github.com/go-logr/logr"
	"github.com/go-logr/zapr"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var logger *Logger

type Logger struct {
	*logr.Logger
}

func GetLogger() *Logger {
	return logger
}

func InitLoggerWithZap() error {
	zapLogger, err := NewZapLogger(NewZapDefaultConfig())
	if err != nil {
		return err
	}
	logger = &Logger{
		Logger: zapLogger,
	}

	return nil
}

func NewZapDefaultConfig() zap.Config {
	return zap.Config{
		Level:       zap.NewAtomicLevelAt(zap.InfoLevel),
		Development: false,
		Sampling: &zap.SamplingConfig{
			Initial:    100,
			Thereafter: 100,
		},
		Encoding: "json",
		EncoderConfig: zapcore.EncoderConfig{
			TimeKey:        "time",
			LevelKey:       "level",
			NameKey:        "logger",
			CallerKey:      "at",
			FunctionKey:    zapcore.OmitKey,
			MessageKey:     "msg",
			StacktraceKey:  "stacktrace",
			LineEnding:     zapcore.DefaultLineEnding,
			EncodeLevel:    zapcore.LowercaseLevelEncoder,
			EncodeTime:     zapcore.ISO8601TimeEncoder,
			EncodeDuration: zapcore.SecondsDurationEncoder,
			EncodeCaller:   zapcore.ShortCallerEncoder,
		},
		OutputPaths:      []string{"stderr"},
		ErrorOutputPaths: []string{"stderr"},
	}
}

func NewZapLogger(conf zap.Config) (*logr.Logger, error) {
	var log logr.Logger

	zapLog, err := conf.Build()
	if err != nil {
		return nil, err
	}
	log = zapr.NewLogger(zapLog)

	return &log, nil
}
