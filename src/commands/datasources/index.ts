import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseDatasourceId, validateJSON } from '../../lib/utils/validators.js';
import type { DatasourceId } from '../../lib/api/branded-types.js';
import {
  listDatasources as coreListDatasources,
  getDatasource as coreGetDatasource,
  createDatasource as coreCreateDatasource,
  updateDatasource as coreUpdateDatasource,
  archiveDatasource as coreArchiveDatasource,
  testDatasource as coreTestDatasource,
  introspectDatasource as coreIntrospectDatasource,
  validateDatasourceQuery as coreValidateDatasourceQuery,
  previewDatasourceQuery as corePreviewDatasourceQuery,
  setDefaultDatasource as coreSetDefaultDatasource,
  getDatasourceSchema as coreGetDatasourceSchema,
  deleteDatasource as coreDeleteDatasource,
} from '../../core/datasources/datasources.js';

export const datasourcesCommand = new Command('datasources')
  .aliases(['datasource', 'ds'])
  .description('Datasource management');

const listCommand = new Command('list').description('List datasources').action(
  withErrorHandling(async () => {
    const globalOptions = getGlobalOptions(listCommand);
    const client = await getAPIClientFromOptions(globalOptions);
    const result = await coreListDatasources(client);
    printFormatted(result.data, globalOptions);
  })
);

const getCommand = new Command('get')
  .description('Get datasource details')
  .argument('<id>', 'datasource ID', parseDatasourceId)
  .action(
    withErrorHandling(async (id: DatasourceId) => {
      const globalOptions = getGlobalOptions(getCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await coreGetDatasource(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const createCommand = new Command('create')
  .description('Create a new datasource')
  .requiredOption('--config <json>', 'datasource configuration as JSON')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(createCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.config, '--config') as Record<string, unknown>;
      const result = await coreCreateDatasource(client, { config });
      console.error(chalk.green(`✓ Datasource created`));
      printFormatted(result.data, globalOptions);
    })
  );

const updateCommand = new Command('update')
  .description('Update a datasource')
  .argument('<id>', 'datasource ID', parseDatasourceId)
  .requiredOption('--config <json>', 'datasource configuration as JSON')
  .action(
    withErrorHandling(async (id: DatasourceId, options) => {
      const globalOptions = getGlobalOptions(updateCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.config, '--config') as Record<string, unknown>;
      const result = await coreUpdateDatasource(client, { id, config });
      console.error(chalk.green(`✓ Datasource ${id} updated`));
      printFormatted(result.data, globalOptions);
    })
  );

const archiveCommand = new Command('archive')
  .description('Archive or unarchive a datasource')
  .argument('<id>', 'datasource ID', parseDatasourceId)
  .option('--unarchive', 'unarchive the datasource', false)
  .action(
    withErrorHandling(async (id: DatasourceId, options) => {
      const globalOptions = getGlobalOptions(archiveCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await coreArchiveDatasource(client, { id, unarchive: options.unarchive });
      const action = options.unarchive ? 'unarchived' : 'archived';
      console.log(chalk.green(`✓ Datasource ${id} ${action}`));
    })
  );

const testCommand = new Command('test')
  .description('Test datasource connection')
  .requiredOption('--config <json>', 'datasource configuration as JSON')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(testCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.config, '--config') as Record<string, unknown>;
      await coreTestDatasource(client, { config });
      console.log(chalk.green(`✓ Datasource connection test passed`));
    })
  );

const introspectCommand = new Command('introspect')
  .description('Introspect datasource schema')
  .requiredOption('--config <json>', 'datasource configuration as JSON')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(introspectCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.config, '--config') as Record<string, unknown>;
      const result = await coreIntrospectDatasource(client, { config });
      printFormatted(result.data, globalOptions);
    })
  );

const validateQueryCommand = new Command('validate-query')
  .description('Validate a datasource query')
  .requiredOption('--config <json>', 'query configuration as JSON')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(validateQueryCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.config, '--config') as Record<string, unknown>;
      await coreValidateDatasourceQuery(client, { config });
      console.log(chalk.green(`✓ Datasource query is valid`));
    })
  );

const previewQueryCommand = new Command('preview-query')
  .description('Preview a datasource query')
  .requiredOption('--config <json>', 'query configuration as JSON')
  .action(
    withErrorHandling(async (options) => {
      const globalOptions = getGlobalOptions(previewQueryCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const config = validateJSON(options.config, '--config') as Record<string, unknown>;
      const result = await corePreviewDatasourceQuery(client, { config });
      printFormatted(result.data, globalOptions);
    })
  );

const setDefaultCommand = new Command('set-default')
  .description('Set a datasource as the default')
  .argument('<id>', 'datasource ID', parseDatasourceId)
  .action(
    withErrorHandling(async (id: DatasourceId) => {
      const globalOptions = getGlobalOptions(setDefaultCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await coreSetDefaultDatasource(client, { id });
      console.log(chalk.green(`✓ Datasource ${id} set as default`));
    })
  );

const schemaCommand = new Command('schema')
  .description('Fetch datasource schema')
  .argument('<id>', 'datasource ID', parseDatasourceId)
  .action(
    withErrorHandling(async (id: DatasourceId) => {
      const globalOptions = getGlobalOptions(schemaCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await coreGetDatasourceSchema(client, { id });
      printFormatted(result.data, globalOptions);
    })
  );

const deleteCommand = new Command('delete')
  .description('Delete a datasource (fails if default or used by any goal)')
  .argument('<id>', 'datasource ID', parseDatasourceId)
  .action(
    withErrorHandling(async (id: DatasourceId) => {
      const globalOptions = getGlobalOptions(deleteCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      await coreDeleteDatasource(client, { id });
      console.log(chalk.green(`✓ Datasource ${id} deleted`));
    })
  );

datasourcesCommand.addCommand(listCommand);
datasourcesCommand.addCommand(getCommand);
datasourcesCommand.addCommand(createCommand);
datasourcesCommand.addCommand(updateCommand);
datasourcesCommand.addCommand(archiveCommand);
datasourcesCommand.addCommand(testCommand);
datasourcesCommand.addCommand(introspectCommand);
datasourcesCommand.addCommand(validateQueryCommand);
datasourcesCommand.addCommand(previewQueryCommand);
datasourcesCommand.addCommand(setDefaultCommand);
datasourcesCommand.addCommand(schemaCommand);
datasourcesCommand.addCommand(deleteCommand);
