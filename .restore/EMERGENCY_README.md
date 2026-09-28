# EMERGENCY restore needed

`src/lib/generate.functions.ts` is PLACEHOLDER on main (commit ed74de4).

Restore from:
- Known-good commit: `c16ea0abb4c187b0c1ae46c7e051bb63f3b7f6d0`
- Then add: free multi reject for free plan; `finalizeMediaAsset` after successful image gen.

Local artifact: full fixed file was prepared (28KB) with executePremiumImage/executeUltraImage/persistGenerationHistory/finalizeMediaAsset.

Workflow `apply-image-studio-fix.yml` reassembles `.restore/*.b64` when complete parts are present.
