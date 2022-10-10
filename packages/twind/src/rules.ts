import type {
  Context,
  ColorValue,
  ColorFunction,
  BaseTheme,
  MatchResult,
  RuleResolver,
  CSSProperties,
  CSSObject,
  RuleResult,
  ThemeValue,
  KebabCase,
  MatchConverter,
} from './types'

import { toColorValue } from './colors'
import { resolveThemeFunction } from './internal/serialize'

export type ThemeMatchResult<Value> = MatchResult & {
  /** The found theme value */
  _: Value
}

export type ThemeRuleResolver<Value, Theme extends BaseTheme = BaseTheme> = RuleResolver<
  Theme,
  ThemeMatchResult<Value>
>

export type ThemeMatchConverter<Value, Theme extends BaseTheme = BaseTheme> = MatchConverter<
  Theme,
  ThemeMatchResult<Value>
>

export function fromTheme<
  Theme extends BaseTheme = BaseTheme,
  Section extends keyof Theme & string = keyof Theme & string,
>(
  /** Theme section to use (default: `$1` — The first matched group) */
  section?: '' | Section | KebabCase<Section>,

  /** The css property (default: value of {@link section}) */
  resolve?: keyof CSSProperties | ThemeRuleResolver<ThemeValue<Theme[Section]>, Theme>,

  convert?: ThemeMatchConverter<ThemeValue<Theme[Section]>, Theme>,
): RuleResolver<Theme> {
  const factory: (
    match: ThemeMatchResult<ThemeValue<Theme[Section]>>,
    context: Context<Theme>,
    section: Section,
  ) => RuleResult = !resolve
    ? ({ 1: $1, _ }, context, section) => ({ [$1 || section]: _ } as CSSObject)
    : typeof resolve == 'string'
    ? (match, context) => ({ [resolve]: convert ? convert(match, context) : match._ } as CSSObject)
    : resolve

  return (match, context) => {
    const themeSection = camelize(section || match[1]) as Section

    const value =
      context.theme(themeSection, match.$$) ??
      (arbitrary(match.$$, themeSection, context) as ThemeValue<Theme[Section]>)

    if (value != null) {
      ;(match as ThemeMatchResult<ThemeValue<Theme[Section]>>)._ =
        match.input[0] == '-' ? (`calc(${value} * -1)` as ThemeValue<Theme[Section]>) : value

      return factory(match as ThemeMatchResult<ThemeValue<Theme[Section]>>, context, themeSection)
    }
  }
}

export type FilterByThemeValue<Theme, Value> = {
  [key in keyof Theme & string]: ThemeValue<Theme[key]> extends Value ? Theme[key] : never
}

export interface ColorFromThemeValue {
  value: string
  color: ColorFunction
  opacityVariable: string | undefined
  opacityValue: string | undefined
}

export interface ColorFromThemeOptions<
  Theme extends BaseTheme = BaseTheme,
  Section extends keyof FilterByThemeValue<Theme, ColorValue> = keyof FilterByThemeValue<
    Theme,
    ColorValue
  >,
  OpacitySection extends keyof FilterByThemeValue<Theme, string> = keyof FilterByThemeValue<
    Theme,
    string
  >,
> {
  /** Theme section to use (default: `$0.replace('-', 'Color')` — The matched string with `Color` appended) */
  section?: Section | KebabCase<Section>
  /** The css property (default: value of {@link section}) */
  property?: keyof CSSProperties
  /** `--tw-${$0}opacity` -> '--tw-text-opacity' */
  opacityVariable?: string | false
  /** `section.replace('Color', 'Opacity')` -> 'textOpacity' */
  opacitySection?: OpacitySection
  selector?: string
}

export function colorFromTheme<
  Theme extends BaseTheme = BaseTheme,
  Section extends keyof FilterByThemeValue<Theme, ColorValue> = keyof FilterByThemeValue<
    Theme,
    ColorValue
  >,
  OpacitySection extends keyof FilterByThemeValue<Theme, string> = keyof FilterByThemeValue<
    Theme,
    string
  >,
>(
  options: ColorFromThemeOptions<Theme, Section, OpacitySection> = {},
  resolve?: ThemeRuleResolver<ColorFromThemeValue, Theme>,
): RuleResolver<Theme> {
  return (match, context) => {
    // text- -> textColor
    // ring-offset(?:-|$) -> ringOffsetColor
    const { section = (camelize(match[0]).replace('-', '') + 'Color') as Section } = options

    // extract color and opacity
    // rose-500                  -> ['rose-500']
    // [hsl(0_100%_/_50%)]       -> ['[hsl(0_100%_/_50%)]']
    // indigo-500/100            -> ['indigo-500', '100']
    // [hsl(0_100%_/_50%)]/[.25] -> ['[hsl(0_100%_/_50%)]', '[.25]']
    if (!/^(\[[^\]]+]|[^/]+?)(?:\/(.+))?$/.test(match.$$)) return

    const { $1: colorMatch, $2: opacityMatch } = RegExp

    const colorValue =
      (context.theme(section, colorMatch) as ColorValue) || arbitrary(colorMatch, section, context)

    if (!colorValue) return

    const {
      // text- -> --tw-text-opacity
      // ring-offset(?:-|$) -> --tw-ring-offset-opacity
      // TODO move this default into preset-tailwind?
      opacityVariable = `--tw-${match[0].replace(/-$/, '')}-opacity`,
      opacitySection = section.replace('Color', 'Opacity') as OpacitySection,
      property = section,
      selector,
    } = options

    const opacityValue =
      (context.theme(opacitySection, opacityMatch || 'DEFAULT') as string | undefined) ||
      (opacityMatch && arbitrary(opacityMatch, opacitySection, context))

    // if (typeof color != 'string') {
    //   console.warn(`Invalid color ${colorMatch} (from ${match.input}):`, color)
    //   return
    // }

    const create =
      resolve ||
      (({ _ }) => {
        const properties = toCSS(property, _)

        return selector ? { [selector]: properties } : properties
      })

    ;(match as ThemeMatchResult<ColorFromThemeValue>)._ = {
      value: toColorValue(colorValue, {
        opacityVariable: opacityVariable || undefined,
        opacityValue: opacityValue || undefined,
      }),
      color: (options) => toColorValue(colorValue, options),
      opacityVariable: opacityVariable || undefined,
      opacityValue: opacityValue || undefined,
    }

    let properties = create(match as ThemeMatchResult<ColorFromThemeValue>, context)

    // auto support dark mode colors
    if (!match.dark) {
      const darkColorValue = context.d(section, colorMatch, colorValue)

      if (darkColorValue && darkColorValue !== colorValue) {
        ;(match as ThemeMatchResult<ColorFromThemeValue>)._ = {
          value: toColorValue(darkColorValue, {
            opacityVariable: opacityVariable || undefined,
            opacityValue: opacityValue || '1',
          }),
          color: (options) => toColorValue(darkColorValue, options),
          opacityVariable: opacityVariable || undefined,
          opacityValue: opacityValue || undefined,
        }

        properties = {
          '&': properties,
          [context.v('dark') as string]: create(
            match as ThemeMatchResult<ColorFromThemeValue>,
            context,
          ),
        } as CSSObject
      }
    }

    return properties
  }
}

export function toCSS(property: string, value: string | ColorFromThemeValue): CSSObject {
  const properties: CSSObject = {}

  if (typeof value === 'string') {
    properties[property] = value
  } else {
    if (value.opacityVariable && value.value.includes(value.opacityVariable)) {
      properties[value.opacityVariable] = value.opacityValue || '1'
    }

    properties[property] = value.value
  }

  return properties
}

export function arbitrary<Theme extends BaseTheme = BaseTheme>(
  value: string,
  section: string,
  context: Context<Theme>,
): string | undefined {
  if (value[0] == '[' && value.slice(-1) == ']') {
    value = normalize(resolveThemeFunction(value.slice(1, -1), context.theme))

    if (
      // Respect type hints from the user on ambiguous arbitrary values - https://tailwindcss.com/docs/adding-custom-styles#resolving-ambiguities
      !(
        // If this is a color section and the value is a hex color, color function or color name
        (
          (/color|fill|stroke/i.test(section) &&
            !(
              /^color:/.test(value) || /^(#|((hsl|rgb)a?|hwb|lab|lch|color)\(|[a-z]+$)/.test(value)
            )) ||
          // url(, [a-z]-gradient(, image(, cross-fade(, image-set(
          (/image/i.test(section) && !(/^image:/.test(value) || /^[a-z-]+\(/.test(value))) ||
          // font-*
          // - fontWeight (type: ['lookup', 'number', 'any'])
          // - fontFamily (type: ['lookup', 'generic-name', 'family-name'])
          (/weight/i.test(section) && !(/^(number|any):/.test(value) || /^\d+$/.test(value))) ||
          // bg-*
          // - backgroundPosition (type: ['lookup', ['position', { preferOnConflict: true }]])
          // - backgroundSize (type: ['lookup', 'length', 'percentage', 'size'])
          (/position/i.test(section) && /^(length|size):/.test(value))
        )
      )
    ) {
      // remove arbitrary type prefix — we do not need it but user may use it
      // https://github.com/tailwindlabs/tailwindcss/blob/master/src/util/dataTypes.js
      // url, number, percentage, length, line-width, shadow, color, image, gradient, position, family-name, lookup, any, generic-name, absolute-size, relative-size
      return value.replace(/^[a-z-]+:/, '')
    }
  }
}

function camelize(value: string): string {
  return value.replace(/-./g, (x) => x[1].toUpperCase())
}

export function normalize(value: string): string {
  // Keep raw strings if it starts with `url(`
  if (value.includes('url(')) {
    return value.replace(
      /(.*?)(url\(.*?\))(.*?)/g,
      (_, before = '', url, after = '') => normalize(before) + url + normalize(after),
    )
  }

  return (
    value
      // Convert `_` to ` `, except for escaped underscores `\_`
      .replace(
        /(^|[^\\])_+/g,
        (fullMatch, characterBefore: string) =>
          characterBefore + ' '.repeat(fullMatch.length - characterBefore.length),
      )
      .replace(/\\_/g, '_')

      // Add spaces around operators inside math functions like calc() that do not follow an operator
      // or '('.
      .replace(/(calc|min|max|clamp)\(.+\)/g, (match) =>
        match.replace(
          /(-?\d*\.?\d(?!\b-.+[,)](?![^+\-/*])\D)(?:%|[a-z]+)?|\))([+\-/*])/g,
          '$1 $2 ',
        ),
      )
  )
}