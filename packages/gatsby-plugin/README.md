# @twind/gatsby-plugin

## READ THIS FIRST!

**Twind v1 is still in beta. Expect bugs!**

---

A [Gatsby](https://github.com/gatsbyjs/gatsby) plugin for [Twind](<(https://www.npmjs.com/package/twind)>) with built-in server-side rendering support.

Used within the following [examples](https://github.com/tw-in-js/twind/tree/next/examples):

- [gatsby](https://github.com/tw-in-js/twind/tree/next/examples/gatsby)

## Installation

Install from npm:

```sh
npm install twind @twind/gatsby-plugin@next
```

## Usage

Please see [examples/gatsby](https://github.com/tw-in-js/twind/tree/next/examples/gatsby) for detailed usage example.

**`gatsby-config.js`**

```js
module.exports = {
  plugins: [
    `@twind/gatsby-plugin`,
    // {
    //   resolve: `@twind/gatsby-plugin`,
    //   options: {
    //     config: `./path/to/twind.config`
    //   }
    // },
  ],
}
```

**`twind.config.js`**

```js
import { defineConfig } from 'twind'
// import { defineConfig } from '@twind/tailwind'

export default defineConfig({
  /* config */
)
```

## Options

This plugin assumes a `twind.config.js` file in the root of your project.

You can use the `config` option to specify a different path to a twind config file:

```js
module.exports = {
  plugins: [
    {
      resolve: `@twind/gatsby-plugin`,
      options: {
        config: `./path/to/twind.config`,
      },
    },
  ],
}
```