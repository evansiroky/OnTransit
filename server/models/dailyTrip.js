module.exports = function(sequelize, DataTypes) {
  var DailyTrip = sequelize.define("daily_trip", {
    daily_trip_id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
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
    trip_id: DataTypes.STRING(255),
    trip_headsign: DataTypes.STRING(255),
    trip_short_name: DataTypes.STRING(100),
    direction_id: DataTypes.INTEGER,
    block_id: DataTypes.STRING(255),
    daily_block_id: DataTypes.STRING(255),
    shape_id: {
      type: DataTypes.STRING(255), 
      references: {
        model: "shape_gis",
        key: "shape_id"
      }
    },
    wheelchair_accessible: DataTypes.INTEGER,
    bikes_allowed: DataTypes.INTEGER,
    start_datetime: DataTypes.DATE,
    end_datetime: DataTypes.DATE
  }, {
    freezeTableName: true,
    classMethods: {
      associate: function (models) {

        DailyTrip.belongsTo(models.route, {
          foreignKeyContraint: true, 
          foreignKey: "route_id" 
        });

        DailyTrip.belongsTo(models.block_delay, {
          foreignKeyContraint: false,
          constraints: false,
          foreignKey: "daily_block_id" 
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

        DailyTrip.hasMany(models.daily_stop_time, {
          foreignKey: 'daily_trip_id'
        });

        DailyTrip.hasMany(models.frequency, {
          foreignKey: 'trip_id'
        });

      }
    }
  });

  return DailyTrip;
}