module.exports = function(sequelize, DataTypes) {
  var DailyStopTime = sequelize.define("daily_stop_time", {
    daily_trip_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'daily_trip',
        key: 'daily_trip_id'
      }
    },
    trip_id: {
      type: DataTypes.STRING(255),
      references: {
        model: 'trip',
        key: 'trip_id'
      }
    },
    arrival_datetime: {
      type: DataTypes.DATE,
      primaryKey: true
    },
    departure_datetime: DataTypes.DATE,
    stop_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      references: {
        model: 'stop',
        key: 'stop_id'
      }
    },
    stop_sequence: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    stop_headsign: DataTypes.STRING(255),
    pickup_type: DataTypes.INTEGER,
    drop_off_type: DataTypes.INTEGER,
    shape_dist_traveled: DataTypes.FLOAT,
    timepoint: DataTypes.INTEGER,
  }, {
    freezeTableName: true,
    classMethods: {
      associate: function (models) {

        DailyStopTime.belongsTo(models.daily_trip, {
          foreignKeyContraint: true, 
          foreignKey: "daily_trip_id" 
        });

        DailyStopTime.belongsTo(models.trip, {
          foreignKeyContraint: true, 
          foreignKey: "trip_id" 
        });
        
        DailyStopTime.belongsTo(models.stop, {
          foreignKeyContraint: true, 
          foreignKey: "stop_id" 
        });

      }
    }
  });

  return DailyStopTime;
}