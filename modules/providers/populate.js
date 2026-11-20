const populate = async (id, config) => {
  const errors = [];
  for (const { provider, key } of config) {
    try {
      const imageUrl = await (key ? provider(id[key]) : provider(id));
      if (imageUrl) return imageUrl;
      errors.push(new Error('Provider returned no image URL'));
    } catch (error) {
      errors.push(error);
    }
  }
  throw new AggregateError(errors, 'No art found in configured providers');
};

export { populate };
