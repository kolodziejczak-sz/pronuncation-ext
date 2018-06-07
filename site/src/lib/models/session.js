const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SessionSchema = new Schema({
  userId: Schema.Types.ObjectId,
  title: String,
  pageURL: String,
  startTime: Number,
  synthesis: Array,
  interimResults: Array,
  finalResults: Array,
  innerHTML: String
}, { timestamps: true });

SessionSchema.methods.setExpirationTime = function(days) {
  const now = new Date().getTime();
  this.expirationTime = now + daysToMs(days);
};

SessionSchema.methods.calcCommon = function() {
  const self = this;
  self.commonSynthesis = getMostCommonWords(this.synthesis, 10, 3);
  self.commonRecognition = getMostCommonWords(this.finalResults, 10, 3);
  return self;
};

function getMostCommonWords(words, top, minOccurences) {
  const dict = createDict(words);
  return Object.keys(dict)
    .filter(key => dict[key] >= (minOccurences || 0)
    .sort((a,b) => dict[b] - dict[a])
    .slice(0, top));
}

function createDict(words) {
  return words.reduce((dict, word) => {
    dict[word] = dict[word] ? dict[word]++ : 1;
    return dict;
  }, {});
}

module.exports = mongoose.model('Session', SessionSchema);