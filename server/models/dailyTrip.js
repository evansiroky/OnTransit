module.exports = function(sequelize, DataTypes) {
  var DailyTrip = sequelize.define("daily_trip", {
    route_id: {
      type: DataTypes.STRING(255),
      references: {
        model: "route",
        key: "route_id"
      }
    },
    service_id: {
      type: DataTypes.STRING(255),
      references: {
        model: "calendar",
        key: "service_id"
      }
    },
    trip_id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    trip_headsign: DataTypes.STRING(255),
    trip_short_name: DataTypes.STRING(100),
    direction_id: DataTypes.INTEGER,
    block_id: DataTypes.STRING(255),
    shape_id: {
      type: DataTypes.STRING(255), 
      references: {
        model: "shape_gis",
        key: "shape_id"
      }
    },
    wheelchair_accessible: DataTypes.INTEGER,
    bikes_allowed: DataTypes.INTEGER,
    start_datetime: {
      type: DataTypes.DATE,
      primaryKey: true
    },
    end_datetime: DataTypes.DATE
  }, {
    freezeTableName: true,
    classMethods: {
      associate: function (models) {

        DailyTrip.belongsTo(models.route, {
          foreignKeyContraint: true, 
          foreignKey: "route_id" 
        });

        DailyTrip.belongsTo(models.calendar, {
          foreignKeyContraint: true, 
          foreignKey: "service_id" 
        });

        DailyTrip.belongsTo(models.shape_gis, {
          foreignKeyContraint: true, 
          foreignKey: "shape_id" 
        });

        DailyTrip.hasMany(models.stop_time, {
          foreignKey: 'trip_id'
        });

        DailyTrip.hasMany(models.frequency, {
          foreignKey: 'trip_id'
        });

      }
    }
  });

  return DailyTrip;
}