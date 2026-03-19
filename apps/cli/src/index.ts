#!/usr/bin/env node
// Factorify CLI — factorify run "..."

import { Command }  from 'commander'
import ora          from 'ora'
import chalk        from 'chalk'
import {
  submitTask, getTaskStatus, listTasks, checkHealth
} from './client.js'

const program = new Command()

program
  .name('factorify')
  .description('Autonomous SaaS Factory — CLI interface')
  .version('0.1.0')

// ── factorify run "task description" ─────────────────────────
program
  .command('run <task>')
  .description('Submit a task to the Factorify platform')
  .option('-p, --priority <level>', 'Task priority: critical|high|normal|low', 'normal')
  .option('-d, --dry-run',          'Plan only — do not execute')
  .option('-c, --context <text>',   'Additional context for the orchestrator')
  .option('-w, --wait',             'Wait for completion and show result', false)
  .action(async (task: string, opts) => {
    const spinner = ora('Submitting task...').start()

    try {
      const { task_id } = await submitTask({
        task,
        priority: opts.priority,
        dry_run:  opts.dryRun,
        context:  opts.context,
      })

      spinner.succeed(`Task accepted: ${chalk.cyan(task_id)}`)

      if (opts.dryRun) {
        console.log(chalk.yellow('\nDry run — planning only\n'))
      }

      if (opts.wait) {
        const poll = ora('Executing...').start()
        let result
        const deadline = Date.now() + 10 * 60 * 1000

        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 3000))
          result = await getTaskStatus(task_id)

          if (result.status === 'completed') {
            poll.succeed(`Completed in ${((result.duration_ms ?? 0) / 1000).toFixed(1)}s`)
            console.log('\n' + chalk.green('-'.repeat(60)))
            console.log(result.result ?? '')
            console.log(chalk.green('-'.repeat(60)) + '\n')
            break
          }

          if (result.status === 'failed') {
            poll.fail(`Failed: ${result.error}`)
            process.exit(1)
          }

          poll.text = `Running... (${result.status})`
        }

        if (!result || result.status === 'running') {
          poll.warn('Timeout — check status with: factorify status ' + task_id)
        }
      } else {
        console.log(
          chalk.dim(`\nCheck status: ${chalk.white('factorify status ' + task_id)}\n`)
        )
      }
    } catch (err) {
      spinner.fail((err as Error).message)
      process.exit(1)
    }
  })

// ── factorify status [task_id] ────────────────────────────────
program
  .command('status [task_id]')
  .description('Check task status or list recent tasks')
  .action(async (taskId?: string) => {
    try {
      if (taskId) {
        const task = await getTaskStatus(taskId)
        const colorFn = {
          completed: chalk.green,
          failed:    chalk.red,
          running:   chalk.yellow,
          queued:    chalk.blue,
        }[task.status] ?? chalk.white

        console.log(`\nTask: ${chalk.cyan(task.id)}`)
        console.log(`Status: ${colorFn(task.status)}`)
        if (task.duration_ms) {
          console.log(`Duration: ${(task.duration_ms / 1000).toFixed(1)}s`)
        }
        if (task.result) {
          console.log('\n' + chalk.green('-'.repeat(60)))
          console.log(task.result.slice(0, 500))
          if (task.result.length > 500) {
            console.log(chalk.dim(`... (${task.result.length} chars total)`))
          }
          console.log(chalk.green('-'.repeat(60)) + '\n')
        }
        if (task.error) {
          console.log(chalk.red('\nError: ' + task.error))
        }
      } else {
        const { tasks } = await listTasks()
        console.log(`\n${chalk.bold('Recent tasks:')}\n`)
        for (const t of tasks) {
          const colorFn = {
            completed: chalk.green,
            failed:    chalk.red,
            running:   chalk.yellow,
            queued:    chalk.blue,
          }[t.status] ?? chalk.white

          console.log(
            `${chalk.dim(t.id.slice(0, 8))}  ` +
            `${colorFn(t.status.padEnd(10))}  ` +
            `${chalk.yellow(t.priority.padEnd(8))}  ` +
            `${t.task.slice(0, 50)}`
          )
        }
        console.log()
      }
    } catch (err) {
      console.error(chalk.red((err as Error).message))
      process.exit(1)
    }
  })

// ── factorify health ──────────────────────────────────────────
program
  .command('health')
  .description('Check platform health')
  .action(async () => {
    try {
      const h = await checkHealth()
      console.log(`\n${chalk.green('*')} Platform is ${chalk.green(h.status)}`)
      console.log(`  Version: ${h.version}`)
      console.log(`  Uptime:  ${h.uptime}s\n`)
    } catch {
      console.log(`\n${chalk.red('*')} Platform is unreachable\n`)
      process.exit(1)
    }
  })

program.parse()
