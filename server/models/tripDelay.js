module.exports = function(sequelize, DataTypes) {
  var TripDelay = sequelize.define("trip_delay", {
    trip_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      references: {
        model: "trip",
        key: "trip_id"
      }
    },
    block_id: DataTypes.STRING(255),
    seconds_of_delay: DataTypes.INTEGER
  }, {
    freezeTableName: true,
    classMethods: {
      associate: function (models) {

        TripDelay.belongsTo(models.trip, { 
          foreignKey: "trip_id" 
        });

        TripDelay.hasMany(models.stop_time, {
          foreignKey: 'trip_id'
        });

      }
    }
  });

  return TripDelay;
}