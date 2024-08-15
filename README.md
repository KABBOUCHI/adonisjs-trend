# adonisjs-trend

Generate trends for your models. Easily generate charts or reports.

## Usage

Install package:

```sh
# npm
npm install adonisjs-trend

# yarn
yarn add adonisjs-trend

# pnpm
pnpm install adonisjs-trend
```

```js
import { Trend } from "adonisjs-trends";
import { DateTime } from "luxon";
import User from "#models/user";

await Trend.model(User)
  .between(DateTime.now().minus({ months: 12 }), DateTime.now())
  .perMonth()
  .count();

await Trend.query(User.query().whereNotNull("email_verified_at"))
  .between(DateTime.now().minus({ years: 42 }), DateTime.now())
  .perYear()
  .average("weight");
```

## Credits

- based on [Flowframe/laravel-trend](https://github.com/Flowframe/laravel-trend) package.

## License

Published under the [MIT](https://github.com/KABBOUCHI/adonisjs-trend/blob/main/LICENSE) license.
