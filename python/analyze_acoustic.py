import opensmile
import pandas as pd

# Initialize eGeMAPS set for dementia/depression screening
smile = opensmile.Smile(
    feature_set=opensmile.FeatureSet.eGeMAPSv02,
    feature_level=opensmile.FeatureLevel.Functionals,
)

def analyze_acoustic(file_path: str):
    # Extract features
    y = smile.process_file(file_path)
    
    # Map key features (jitter, shimmer, f0, hnr)
    # Note: openSMILE column names depend on the feature set
    return {
        "jitterLocal_shimmerLocal_mean": y["jitterLocal_shimmerLocal_mean"].item(),
        "f0_mean": y["F0semitoneFrom27.5Hz_sma3nz_amean"].item(),
        "f0_std": y["F0semitoneFrom27.5Hz_sma3nz_stddevNorm"].item(),
        "hnr_mean": y["HNRdB1.0_sma3nz_amean"].item(),
        "shimmer_mean": y["shimmerLocal_sma3nz_amean"].item() if "shimmerLocal_sma3nz_amean" in y else 0
    }
