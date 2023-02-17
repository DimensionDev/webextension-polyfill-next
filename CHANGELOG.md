# @dimensiondev/webextension-polyfill

## 0.1.0

### Minor Changes

-   1ab0452: impl browser.permission
-   ac39e07: impl browser.downloads.download
-   2998937: impl browser.runtime
-   2a75378: support worker
-   d5a59bf: remove intrinsic clone in prod since iOS 14 has WKContentWorld
-   4b652f6: impl module loader
-   1ab0452: impl browser.storage
-   88156f5: impl browser.tabs
-   1ab0452: impl browser.webNavigation
-   1ab0452: impl browser.extension
-   46a1ec7: add local impl for framework

### Patch Changes

-   a00bff4: migrate URL, open, close
-   40006bf: implement module loader for WebExtension isolate
-   473e609: impl mv2 background loading logic
-   3c287c9: migrate debug mode code
-   4b4dfab: impl fetch
-   ee0d966: add bundle version
-   2bcddd8: implement manifest parser
-   f42c1cb: add debugger
-   b472513: add WebkitChannel
