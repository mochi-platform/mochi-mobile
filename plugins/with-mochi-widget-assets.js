// Imágenes del widget: Glance solo carga drawables del APK, y el selector de widgets necesita
// android:previewImage para mostrar una miniatura en vez del layout genérico de expo-widgets.
const fs = require('fs')
const path = require('path')
const { withFinalizedMod } = require('expo/config-plugins')

const PREVIEWS = {
  mochi_resumen_widget_info: 'widget_preview_resumen',
  mochi_racha_widget_info: 'widget_preview_racha',
  mochi_duo_widget_info: 'widget_preview_duo',
}

module.exports = function withMochiWidgetAssets(config) {
  return withFinalizedMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot
      const resDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res')
      const drawableDir = path.join(resDir, 'drawable-nodpi')
      fs.mkdirSync(drawableDir, { recursive: true })
      const assetsDir = path.join(projectRoot, 'assets/widget')
      for (const file of fs.readdirSync(assetsDir)) {
        if (file.endsWith('.png')) fs.copyFileSync(path.join(assetsDir, file), path.join(drawableDir, file))
      }
      for (const [info, preview] of Object.entries(PREVIEWS)) {
        const xmlPath = path.join(resDir, 'xml', `${info}.xml`)
        if (!fs.existsSync(xmlPath)) continue
        const xml = fs.readFileSync(xmlPath, 'utf8')
        if (xml.includes('android:previewImage')) continue
        fs.writeFileSync(
          xmlPath,
          xml.replace('<appwidget-provider ', `<appwidget-provider android:previewImage="@drawable/${preview}" `),
        )
      }
      return cfg
    },
  ])
}
