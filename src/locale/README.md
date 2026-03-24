# Translating SpessaFont

### Contributing a New Translation

I welcome contributions from translators! To add a new locale, please follow these steps:

1. **Prepare the app**
    - Clone the repository.
    - `npm install`
    - `npm run dev`
    - Open the link that appears (`http://localhost:5173` or similar)

2. **Create a New Locale Folder**
    - Create a new folder in this folder named `locale_[your language 2-letter ISO code]`. For example, for German, the
      folder name would be `locale_de`.

3. **Copy an Existing Locale**
    - Copy the contents of `locale_en` (or any other existing locale you want to translate from) into your new folder.

4. **Update `locale.ts`**
    - Open `locale.ts` in your new folder.
    - Rename `export const localeEnglish` in `locale.ts` to reflect your language. For example, `localeEnglish` would
      become `localeGerman` for German.

5. **Update `locale_list.ts`**
    - Open `locale_list.ts`.
    - Add a new entry for your locale. For example, for German, add: `"de": localeGerman,`.

6. **Translate!**
    - Select your language in the opened website.
    - Translate all the strings in the `locale.ts` file and all `.ts` files in the folders. Make sure to leave the
      object keys unchanged.
    - You may add comments to indicate who translated the text, e.g., `// translated by: XYZ`.
    - The website should automatically update as you translate. If not, reload the page.
    - **Note:** Strings containing placeholders, like `Copied {{count}} samples`, should keep the placeholders intact. They are used for
      formatting and should not be altered.
    - **Note 2:** The code sets `textContent` property, so doing HTML characters like `&lt;`
      is not needed.
      For new line, use `\n`

7. **Verify your work**
    - `npm run build` to perform a full build with type checks.
    - Change the language to the translated language.

8. **Submit a Pull Request**
    - After completing the translation and updates, create a pull request with your changes. Thank you for helping
      SpessaFont!
