#!/usr/bin/env ts-node

/**
 * Prisma's CLI
 *
 * TODO: separate into files
 */

/**
 * Dependencies
 */
import * as dedent from 'strip-indent'
import * as prompt from 'prompts'
import * as Arg from 'arg'
import chalk from 'chalk'

/**
 * Main function
 */
async function main(): Promise<number> {
  // load the environment
  const env = await Env.load(process.env)
  if (isError(env)) {
    console.error(env)
    return 1
  }
  // create a new CLI with our subcommands
  const cli = CLI.new({
    migrate: Migrate.new({
      new: MigrateNew.new(),
      up: MigrateUp.new()
    })
  })
  // parse the arguments
  var result = await cli.parse(process.argv.slice(2))
  if (result instanceof HelpError) {
    console.error(result.message)
    return 1
  } else if (isError(result)) {
    console.error(result)
    return 1
  }
  console.log(result)

  return 0
}

/**
 * Command interface
 */
interface Command {
  parse(argv: string[]): Promise<string | Error>
}

/**
 * Commands
 */
type Commands = { [command: string]: Command }

/**
 * Environment to load
 *
 * TODO: finish
 */
class Env {
  static async load(env: NodeJS.ProcessEnv): Promise<Error | Env> {
    return new Env(env)
  }
  private constructor(private readonly env: NodeJS.ProcessEnv) {}
}

/**
 * CLI command
 */
class CLI implements Command {
  static new(cmds: Commands): CLI {
    return new CLI(cmds)
  }
  private constructor(private readonly cmds: Commands) {}

  async parse(argv: string[]): Promise<string | Error> {
    // parse the args according to the following spec
    const args = arg(argv, {
      '--help': Boolean,
      '-h': '--help'
    })
    if (isError(args)) {
      return this.help(args.message)
    }
    // display help for help flag or no subcommand
    if (args._.length === 0 || args['--help']) {
      return this.help()
    }
    // check if we have that subcommand
    const cmd = this.cmds[args._[0]]
    if (cmd) {
      return cmd.parse(args._.slice(1))
    }
    // unknown command
    return unknownCommand(CLI.help, args._[0])
  }

  // help function
  private help(error?: string): string | HelpError {
    if (error) {
      return new HelpError(`\n${chalk.bold.redBright(`!`)} ${error}\n${CLI.help}`)
    }
    return CLI.help
  }

  // static help template
  private static help = format(`
    ${chalk.bold.greenBright('▲')} Prisma makes your data easy (https://prisma.io)

    ${chalk.bold('Usage')}

      ${chalk.dim(`$`)} prisma [command]

    ${chalk.bold('Commands')}

         admin   Administer your database
         cloud   Manage Prisma Cloud
          docs   Open documentation in the browser
       destroy   Destroy all Prisma resources
      generate   Generate a database client
          help   Display help about a Prisma command
          info   Get app-specific Prisma information
        import   Import data into your database
       inspect   Inspect the schema from a database
        export   Import data from your database
       migrate   Migrate your datamodel
           new   Setup Prisma for your app
          seed   Seed data into your database
        schema   List your datamodel

    ${chalk.bold('Examples')}

      Initialize files for a new Prisma service
      ${chalk.dim(`$`)} prisma new

      Deploy service changes (or new service)
      ${chalk.dim(`$`)} prisma deploy
  `)
}

/**
 * Migrate command
 */
class Migrate implements Command {
  static new(cmds: Commands): Migrate {
    return new Migrate(cmds)
  }
  private constructor(private readonly cmds: Commands) {}

  async parse(argv: string[]): Promise<string | Error> {
    // parse the arguments according to the spec
    const args = arg(argv, {
      '--help': Boolean,
      '-h': '--help'
    })
    if (isError(args)) {
      return this.help(args.message)
    }
    // display help for help flag or no subcommand
    if (args._.length === 0 || args['--help']) {
      return this.help()
    }
    // check if we have that subcommand
    const cmd = this.cmds[args._[0]]
    if (cmd) {
      return cmd.parse(args._.slice(1))
    }
    return unknownCommand(Migrate.help, args._[0])
  }

  help(error?: string): string | HelpError {
    if (error) {
      return new HelpError(`\n${chalk.bold.redBright(`!`)} ${error}\n${Migrate.help}`)
    }
    return Migrate.help
  }

  // static help template
  private static help = format(`
    Migrate your database schema and data safely

    ${chalk.bold('Usage')}

      prisma migrate [command] [options]

    ${chalk.bold('Options')}

      -n, --name      Name of the migration
      -p, --preview   Preview the migration changes
      -w, --watch     Watch for datamodel changes

    ${chalk.bold('Commands')}

      docs   Open documentation in the browser
      down   Migrate your database down
      help   Display command-specific help
       new   Setup a new migration
        up   Migrate your database up

    ${chalk.bold('Examples')}

      Migrate up to the latest datamodel
      ${chalk.dim(`$`)} prisma migrate

      Create new migration folder
      ${chalk.dim(`$`)} prisma migrate new

      Rollback a migration
      ${chalk.dim(`$`)} prisma migrate down 1

      Preview the next migration without applying
      ${chalk.dim(`$`)} prisma migrate up 1 --preview

      Watch for any changes to the datamodel
      ${chalk.dim(`$`)} prisma migrate --watch
  `)
}

/**
 * $ prisma migrate new
 */
class MigrateNew implements Command {
  static new(): MigrateNew {
    return new MigrateNew()
  }
  private constructor() {}

  // parse arguments
  async parse(argv: string[]): Promise<string | Error> {
    // parse the arguments according to the spec
    const args = arg(argv, {
      '--help': Boolean,
      '-h': '--help',
      '--name': String,
      '-n': '--name'
    })
    if (isError(args)) {
      return this.help(args.message)
    } else if (args['--help']) {
      return this.help()
    }
    const name = await this.name(args['--name'])
    if (isError(name)) {
      return name
    }

    console.log('name', name)

    return ``
  }

  // get the name
  async name(name?: string): Promise<string | Error> {
    if (name) return name
    let response = await prompt({
      type: 'text',
      name: 'name',
      message: 'Name of migration',
      validate: value => value.length
    })
    if (!response.name) {
      return this.help('No name provided')
    }
    return response.name
  }

  // help message
  help(error?: string): string | HelpError {
    if (error) {
      return new HelpError(`\n${chalk.bold.redBright(`!`)} ${error}\n${MigrateNew.help}`)
    }
    return MigrateNew.help
  }

  // static help template
  private static help = format(`
    Create a new migration.

    ${chalk.bold('Usage')}

      prisma migrate new [options]

    ${chalk.bold('Options')}

      -n, --name   Name of the migration

    ${chalk.bold('Examples')}

      Create a new migration
      ${chalk.dim(`$`)} prisma migrate new

      Create a new migration by name
      ${chalk.dim(`$`)} prisma migrate new --name "add unique to email"

  `)
}

class MigrateUp implements Command {
  static new(): MigrateUp {
    return new MigrateUp()
  }
  private constructor() {}

  // parse arguments
  async parse(argv: string[]): Promise<string | Error> {
    // parse the arguments according to the spec
    const args = arg(argv, {
      '--help': Boolean,
      '-h': '--help'
    })
    if (isError(args)) {
      return this.help(args.message)
    } else if (args['--help']) {
      return this.help()
    }
    // unknown command
    return unknownCommand(MigrateUp.help, args._[0])
  }

  // help message
  help(error?: string): string | HelpError {
    if (error) {
      return new HelpError(`\n${chalk.bold.redBright(`!`)} ${error}\n${MigrateUp.help}`)
    }
    return MigrateUp.help
  }

  // static help template
  private static help = format(`
    Migrate your database up to a specific state.

    ${chalk.bold('Usage')}

      prisma migrate up [<inc|name|timestamp>]

    ${chalk.bold('Arguments')}

      [<inc|ts|name>]   go up by an increment or to a timestamp or name [default: latest]

    ${chalk.bold('Options')}

      -p, --preview   Preview the migration changes

    ${chalk.bold('Examples')}

      Create a new migration and migrate up
      ${chalk.dim(`$`)} prisma migrate new --name "add unique to email"
      ${chalk.dim(`$`)} prisma migrate up

      Preview a migration without applying
      ${chalk.dim(`$`)} prisma migrate up --preview

      Go up by one migration
      ${chalk.dim(`$`)} prisma migrate up 1

      Go up by one migration
      ${chalk.dim(`$`)} prisma migrate up 1

      Go up by to a migration by name
      ${chalk.dim(`$`)} prisma migrate up
  `)
}

/**
 * Unknown command
 */
function unknownCommand(helpTemplate: string, cmd: string): HelpError {
  return new HelpError(`\n${chalk.bold.redBright(`!`)} Unknown command "${cmd}"\n${helpTemplate}`)
}

/**
 * Custom help error used to display help
 * errors without printing a stack trace
 */
class HelpError extends Error {
  constructor(msg: string) {
    super(msg)
    // setPrototypeOf is needed for custom errors to work
    Object.setPrototypeOf(this, HelpError.prototype)
  }
}

/**
 * format
 */
function format(input: string = ''): string {
  return dedent(input).trimRight() + '\n'
}

/**
 * Wrap arg to return an error instead of throwing
 */
function arg<T extends Arg.Spec>(argv: string[], spec: T): Arg.Result<T> | Error {
  try {
    return Arg(spec, { argv, stopAtPositional: true })
  } catch (err) {
    return err
  }
}

/**
 * Check if result is an error
 */
function isError(result: any): result is Error {
  return result instanceof Error
}

/**
 * Run our program
 */
main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
