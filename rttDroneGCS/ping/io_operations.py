import csv
import os
from typing import List, Dict
import numpy as np
from osgeo import gdal, osr


def save_csv(data_dir: str, l_tx: np.ndarray, size: int, heat_map_area: np.ndarray):
    csv_data: List[Dict[str, float]] = []
    ref_x, min_y = l_tx[0] - (size / 2), l_tx[1] - (size / 2)

    for y in range(size):
        for x in range(size):
            csv_data.append(
                {
                    "easting": ref_x + x,
                    "northing": min_y + y,
                    "value": heat_map_area[y, x],
                }
            )

    csv_path = os.path.join(data_dir, "query.csv")
    with open(csv_path, "w", newline="") as csvfile:
        fieldnames = ["easting", "northing", "value"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_data)


def save_tiff(
    data_dir: str,
    freq: int,
    zone_num: int,
    zone: str,
    l_tx: np.ndarray,
    size: int,
    heat_map_area: np.ndarray,
):
    output_file_name = os.path.join(
        data_dir, f"PRECISION_{freq / 1e6:.3f}_{len(heat_map_area)}_heatmap.tiff"
    )
    driver = gdal.GetDriverByName("GTiff")
    dataset = driver.Create(
        output_file_name, size, size, 1, gdal.GDT_Float32, ["COMPRESS=LZW"]
    )

    spatial_reference = osr.SpatialReference()
    spatial_reference.SetUTM(zone_num, zone >= "N")
    spatial_reference.SetWellKnownGeogCS("WGS84")
    wkt = spatial_reference.ExportToWkt()
    dataset.SetProjection(wkt)

    ref_x, ref_y = l_tx[0] - (size / 2), l_tx[1] + (size / 2)
    dataset.SetGeoTransform((ref_x, 1, 0, ref_y, 0, -1))

    band = dataset.GetRasterBand(1)
    band.WriteArray(heat_map_area)
    band.SetStatistics(
        np.amin(heat_map_area),
        np.amax(heat_map_area),
        np.mean(heat_map_area),
        np.std(heat_map_area),
    )
    dataset.FlushCache()
    dataset = None
