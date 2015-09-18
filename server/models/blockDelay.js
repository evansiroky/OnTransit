module.exports = function(sequelize, DataTypes) {
  var BlockDelay = sequelize.define("block_delay", {
    daily_block_id: {
      type: DataTypes.STRING(255),
      primaryKey: true
    },
    seconds_of_delay: DataTypes.INTEGER
  }, {
    freezeTableName: true,
    classMethods: {
      associate: function (models) {

        BlockDelay.hasMany(models.daily_trip, {
          constraints: false,
          foreignKey: 'daily_block_id'
        });

      }
    }
  });

  return BlockDelay;
}