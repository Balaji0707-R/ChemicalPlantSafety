import type { SchemaOptions } from "mongoose";

export const stripMongoMetadata = <T extends Record<string, unknown>>(
  value: T
): Omit<T, "_id" | "__v"> => {
  const result = { ...value };
  delete result._id;
  delete result.__v;
  return result;
};

const serializeWithoutMongoMetadata = (_document: unknown, result: any) =>
  stripMongoMetadata(result);

export const legacyModelOptions = (collection: string): SchemaOptions => ({
  collection,
  versionKey: false,
  toJSON: { transform: serializeWithoutMongoMetadata },
  toObject: { transform: serializeWithoutMongoMetadata },
});
