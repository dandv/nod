// @flow
import _ from 'lodash'
import fs from 'fs'
import glob from 'glob'
import askName from 'inquirer-npm-name'
import Generator from 'yeoman-generator'

type answers = {
  name: string,
  description: string,
  githubUsername: string,
  repository: string,
  homepage: string,
  authorName: string,
  authorEmail: string,
  authorUrl: string
}

export default class extends Generator {
  answers: answers

  constructor(...args: Array<*>) {
    super(...args)
    this.argument('appname', { type: String, required: false })
  }

  getGitHubUsername = (): Promise<string> => new Promise((resolve) => {
    // istanbul ignore next
    try {
      this.user.github.username((err, username) => resolve(username))
    } catch (e) {
      resolve('')
    }
  })

  async prompting() {
    const { name } = await askName({
      name: 'name',
      message: 'What do you want to name your module?',
      default: _.kebabCase(this.options.appname || this.appname),
    }, this)

    const props = await this.prompt([{
      name: 'description',
      message: 'What is the description of your module?',
      default: 'An awesome module'
    }, {
      name: 'githubUsername',
      message: 'What is your GitHub username or organization?',
      default: this.getGitHubUsername
    }, {
      name: 'repository',
      message: 'What is the repository of your module?',
      default: ({ githubUsername }): string => `${githubUsername}/${name}`
    }, {
      name: 'homepage',
      message: 'What is the homepage of your module?',
      default: ({ repository }): string => `https://github.com/${repository}`
    }, {
      name: 'authorName',
      message: 'What is your name?',
      default: this.user.git.name()
    }, {
      name: 'authorEmail',
      message: 'What is your email?',
      default: this.user.git.email()
    }, {
      name: 'authorUrl',
      message: 'What is your homepage?',
      default: ({ githubUsername }): string => `https://github.com/${githubUsername}`
    }])

    this.answers = { name, ...props }
  }

  async writing() {
    const cwd = this.templatePath('nod')
    const ignore: string[] = ['**/.git/**', 'README.md']
    const files: string[] = glob.sync('**/*', { cwd, ignore, dot: true })

    this.fs.copyTpl(this.templatePath('README.md'), this.destinationPath('README.md'), this.answers)

    files.forEach((file: string) => {
      if (fs.statSync(this.templatePath('nod', file)).isDirectory()) return
      this.fs.copy(this.templatePath('nod', file), this.destinationPath(file))
      const contents: string = this.fs.read(this.destinationPath(file))
        .replace(/https:\/\/github.com\/diegohaz\/nod/g, this.answers.homepage)
        .replace(/https:\/\/github.com\/diegohaz/g, this.answers.authorUrl)
        .replace(/diegohaz\/nod/g, this.answers.repository)
        .replace(/generator-nod/g, this.answers.name)
        .replace(/hazdiego@gmail.com/g, this.answers.authorEmail)
        .replace(/diegohaz/g, this.answers.githubUsername)
        .replace(/Diego Haz/g, this.answers.authorName)
        .replace(/My node module/g, this.answers.description)
      this.fs.write(this.destinationPath(file), contents)
    })
  }
}