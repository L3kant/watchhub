const { isSafeExternalLink } = require('./launchers');

function getCountryStreamingOptions(showData, countryCode = 'cz') {
  const streamingOptions = showData?.streamingOptions;

  if (!streamingOptions || typeof streamingOptions !== 'object') {
    return [];
  }

  const options = streamingOptions[countryCode] || streamingOptions[countryCode.toUpperCase()];

  if (!Array.isArray(options)) {
    return [];
  }

  return options;
}

function getPreferredStreamingOption(options, motnServiceId) {
  const matchingOptions = options.filter((option) => {
    return option?.service?.id === motnServiceId && isSafeExternalLink(option.link);
  });

  if (matchingOptions.length === 0) {
    return null;
  }

  const subscriptionOption = matchingOptions.find((option) => {
    return option.type === 'subscription';
  });

  return subscriptionOption || matchingOptions[0];
}

module.exports = {
  getCountryStreamingOptions,
  getPreferredStreamingOption,
};
