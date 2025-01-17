package db

import (
	"xorm.io/xorm"
	//import sqlite3 driver
	_ "modernc.org/sqlite"
	"github.com/sirupsen/logrus"
	"gofi/env"
	"gofi/tool"
)

var engine *xorm.Engine

func init() {
	engine = createEngine()
	SyncGuestPermissions()
	SyncAdmin()
}

func createEngine() *xorm.Engine {
	// connect to database
	engine, err := xorm.NewEngine("sqlite", tool.GetDatabaseFilePath())
	if err != nil {
		logrus.Println(err)
		panic("failed to connect database")
	}

	if env.IsTest() {
		logrus.Info("on environment,skip database sync")
	} else {
		// migrate database
		if err := engine.Sync2(new(Configuration), new(User), new(Permission)); err != nil {
			logrus.Error(err)
		}
	}

	if env.IsDevelop() {
		engine.ShowSQL(true)
	}

	return engine
}
