function currentIsoDate() {
  const date = new Date();
  const timezoneOffset = -date.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0');
  const minutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0');
  date.setTime(date.getTime() + timezoneOffset);
  return date.toISOString().replace('Z', `${sign}${hours}:${minutes}`);
}

function Logger(tag) {
  tag = `[${tag}]`;
  return {
    info(...args) {
      return console.info('INFO ', currentIsoDate(), tag, ...args);
    },
    error(...args) {
      return console.error('ERROR', currentIsoDate(), tag, ...args);
    },
  };
}
exports.Logger = Logger;
