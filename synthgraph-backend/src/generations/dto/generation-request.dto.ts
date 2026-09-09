import { BadRequestException } from '@nestjs/common';

import {
  GenerationDataReference,
  GenerationGenerator,
  GenerationReproducibility,
  GenerationStatus,
} from '../../database/entities/generation.entity.js';

export type CreateGenerationRequest = {
  name: string;
  generator: GenerationGenerator;
  parameters: Record<string, unknown>;
  reproducibility: GenerationReproducibility;
  inputs: GenerationDataReference[];
  outputs: GenerationDataReference[];
};

export type UpdateGenerationStatusRequest = {
  status: GenerationStatus;
};

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException(`${field} must be a JSON object`);
  }

  return value as Record<string, unknown>;
}

function onlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
): void {
  const unsupported = Object.keys(value).find((key) => !allowed.includes(key));

  if (unsupported) {
    throw new BadRequestException(`${field}.${unsupported} is not supported`);
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string`);
  }

  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requiredString(value, field);
}

function generator(value: unknown): GenerationGenerator {
  const input = record(value, 'generator');
  onlyKeys(input, ['name', 'version', 'type'], 'generator');

  const result: GenerationGenerator = {
    name: requiredString(input.name, 'generator.name'),
  };
  const version = optionalString(input.version, 'generator.version');
  const type = optionalString(input.type, 'generator.type');

  if (version !== undefined) result.version = version;
  if (type !== undefined) result.type = type;

  return result;
}

function reproducibility(value: unknown): GenerationReproducibility {
  const input = record(value, 'reproducibility');
  onlyKeys(
    input,
    ['seed', 'code_version', 'environment', 'configuration_hash'],
    'reproducibility',
  );

  const result: GenerationReproducibility = {};

  if (input.seed !== undefined) {
    if (typeof input.seed !== 'number' || !Number.isSafeInteger(input.seed)) {
      throw new BadRequestException(
        'reproducibility.seed must be a safe integer',
      );
    }
    result.seed = input.seed;
  }

  const codeVersion = optionalString(
    input.code_version,
    'reproducibility.code_version',
  );
  const configurationHash = optionalString(
    input.configuration_hash,
    'reproducibility.configuration_hash',
  );

  if (codeVersion !== undefined) result.code_version = codeVersion;
  if (configurationHash !== undefined) {
    result.configuration_hash = configurationHash;
  }
  if (input.environment !== undefined) {
    result.environment = record(
      input.environment,
      'reproducibility.environment',
    );
  }

  return result;
}

function reference(value: unknown, field: string): GenerationDataReference {
  const input = record(value, field);
  onlyKeys(
    input,
    ['id', 'uri', 'name', 'metadata', 'type', 'format', 'size'],
    field,
  );

  const result: GenerationDataReference = {
    id: requiredString(input.id, `${field}.id`),
  };
  const uri = optionalString(input.uri, `${field}.uri`);
  const name = optionalString(input.name, `${field}.name`);

  if (uri !== undefined) result.uri = uri;
  if (name !== undefined) result.name = name;

  if (input.metadata !== undefined) {
    result.metadata = record(input.metadata, `${field}.metadata`);
  }

  for (const key of ['type', 'format'] as const) {
    const item = input[key];
    if (item !== undefined) {
      if (item !== null && typeof item !== 'string') {
        throw new BadRequestException(
          `${field}.${key} must be a string or null`,
        );
      }
      result[key] = item;
    }
  }

  if (input.size !== undefined) {
    if (
      input.size !== null &&
      (typeof input.size !== 'number' ||
        !Number.isSafeInteger(input.size) ||
        input.size < 0)
    ) {
      throw new BadRequestException(
        `${field}.size must be a non-negative integer or null`,
      );
    }
    result.size = input.size;
  }

  return result;
}

function references(value: unknown, field: string): GenerationDataReference[] {
  if (value === undefined) return [];

  if (!Array.isArray(value)) {
    throw new BadRequestException(`${field} must be a JSON array`);
  }

  return value.map((item, index) => reference(item, `${field}[${index}]`));
}

export function validateCreateGenerationRequest(
  value: unknown,
): CreateGenerationRequest {
  const input = record(value, 'body');
  onlyKeys(
    input,
    ['name', 'generator', 'parameters', 'reproducibility', 'inputs', 'outputs'],
    'body',
  );

  return {
    name: requiredString(input.name, 'name'),
    generator: generator(input.generator),
    parameters: record(input.parameters, 'parameters'),
    reproducibility: reproducibility(input.reproducibility),
    inputs: references(input.inputs, 'inputs'),
    outputs: references(input.outputs, 'outputs'),
  };
}

export function validateUpdateGenerationStatusRequest(
  value: unknown,
): UpdateGenerationStatusRequest {
  const input = record(value, 'body');
  onlyKeys(input, ['status'], 'body');

  if (
    input.status !== GenerationStatus.Running &&
    input.status !== GenerationStatus.Completed &&
    input.status !== GenerationStatus.Failed
  ) {
    throw new BadRequestException(
      'status must be running, completed, or failed',
    );
  }

  return { status: input.status };
}
