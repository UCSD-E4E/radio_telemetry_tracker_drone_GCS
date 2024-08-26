


import csv
import math
import os
from pathlib import Path
from threading import Thread
from typing import Tuple, Optional

import requests
from PyQt5.QtCore import Qt, QDir
from PyQt5.QtGui import QColor
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QFileDialog,
    QAction, QToolBar
)

from qgis.core import (
    QgsRectangle, QgsPointXY, QgsGeometry, QgsFeature, QgsField,
    QgsVectorLayer, QgsRasterLayer, QgsProject, QgsCoordinateTransform,
    QgsCoordinateReferenceSystem, QgsSymbol, QgsRendererRange,
    QgsGraduatedSymbolRenderer, QgsMarkerSymbol, QgsSvgMarkerSymbolLayer,
    QgsWkbTypes, QgsProperty
)
from qgis.gui import QgsMapCanvas, QgsMapToolEmitPoint, QgsRubberBand

from .popups import UserPopups

class RectangleMapTool(QgsMapToolEmitPoint):
    def __init__(self, canvas):
        super().__init__(canvas)
        self.canvas = canvas
        self.rubber_band = QgsRubberBand(self.canvas, True)
        self.rubber_band.setColor(QColor(0, 255, 255, 125))
        self.rubber_band.setWidth(1)
        self.reset()

    def reset(self):
        self.start_point = self.end_point = None
        self.is_emitting_point = False
        self.rubber_band.reset(True)

    def canvasPressEvent(self, e):
        self.start_point = self.toMapCoordinates(e.pos())
        self.end_point = self.start_point
        self.is_emitting_point = True
        self.show_rect(self.start_point, self.end_point)

    def canvasReleaseEvent(self, e):
        self.is_emitting_point = False

    def canvasMoveEvent(self, e):
        if not self.is_emitting_point:
            return
        self.end_point = self.toMapCoordinates(e.pos())
        self.show_rect(self.start_point, self.end_point)

    def show_rect(self, start_point, end_point):
        self.rubber_band.reset(QgsWkbTypes.PolygonGeometry)
        if start_point.x() == end_point.x() or start_point.y() == end_point.y():
            return
        points = [
            QgsPointXY(start_point.x(), start_point.y()),
            QgsPointXY(start_point.x(), end_point.y()),
            QgsPointXY(end_point.x(), end_point.y()),
            QgsPointXY(end_point.x(), start_point.y())
        ]
        for i, point in enumerate(points):
            self.rubber_band.addPoint(point, i == len(points) - 1)
        self.rubber_band.show()

    def rectangle(self):
        if self.start_point is None or self.end_point is None:
            return None
        if self.start_point.x() == self.end_point.x() or self.start_point.y() == self.end_point.y():
            return None
        return QgsRectangle(self.start_point, self.end_point)

class PolygonMapTool(QgsMapToolEmitPoint):
    def __init__(self, canvas):
        super().__init__(canvas)
        self.canvas = canvas
        self.vertices = []
        self.rubber_band = QgsRubberBand(self.canvas, QgsWkbTypes.PolygonGeometry)
        self.rubber_band.setColor(Qt.red)
        self.rubber_band.setWidth(1)
        self.reset()

    def reset(self):
        self.start_point = self.end_point = None
        self.is_emitting_point = False
        self.rubber_band.reset(True)

    def canvasPressEvent(self, e):
        self.start_point = self.toMapCoordinates(e.pos())
        self.end_point = self.start_point
        self.is_emitting_point = True
        self.add_vertex(self.start_point)
        self.show_line(self.start_point, self.end_point)
        self.show_polygon()

    def canvasReleaseEvent(self, e):
        self.is_emitting_point = False

    def canvasMoveEvent(self, e):
        if not self.is_emitting_point:
            return
        self.end_point = self.toMapCoordinates(e.pos())
        self.show_line(self.start_point, self.end_point)

    def add_vertex(self, point):
        self.vertices.append(QgsPointXY(point))

    def show_polygon(self):
        if len(self.vertices) > 1:
            self.rubber_band.reset(QgsWkbTypes.PolygonGeometry)
            for i, vertex in enumerate(self.vertices):
                self.rubber_band.addPoint(vertex, i == len(self.vertices) - 1)
            self.rubber_band.show()

    def show_line(self, start_point, end_point):
        self.rubber_band.reset(QgsWkbTypes.PolygonGeometry)
        if start_point.x() == end_point.x() or start_point.y() == end_point.y():
            return
        self.rubber_band.addPoint(QgsPointXY(start_point.x(), start_point.y()), True)
        self.rubber_band.show()

class VehicleData:
    def __init__(self):
        self.ind = 0
        self.last_loc = None

class MapWidget(QWidget):
    def __init__(self, root):
        super().__init__()
        self.holder = QVBoxLayout()
        self.ground_truth = None
        self.map_layer = None
        self.vehicle = None
        self.vehicle_path = None
        self.precision = None
        self.cones = None
        self.vehicle_data = {}
        self.ping_layer = None
        self.ping_renderer = None
        self.estimate = None
        self.tool_polygon = None
        self.polygon_layer = None
        self.polygon_action = None
        self.heat_map = None
        self.ping_min = 800
        self.ping_max = 0
        self.cone_min = float('inf')
        self.cone_max = float('-inf')
        self.ind = 0
        self.ind_ping = 0
        self.ind_est = 0
        self.ind_cone = 0
        self.toolbar = QToolBar()
        self.canvas = QgsMapCanvas()
        self.canvas.setCanvasColor(Qt.white)

        self.transform_to_web = QgsCoordinateTransform(
            QgsCoordinateReferenceSystem("EPSG:4326"),
            QgsCoordinateReferenceSystem("EPSG:3857"),
            QgsProject.instance()
        )
        self.transform = QgsCoordinateTransform(
            QgsCoordinateReferenceSystem("EPSG:3857"),
            QgsCoordinateReferenceSystem("EPSG:4326"),
            QgsProject.instance()
        )

    def set_up_heat_map(self):
        file_name = QFileDialog.getOpenFileName()
        if file_name[0]:
            if self.heat_map is not None:
                QgsProject.instance().removeMapLayer(self.heat_map)
            self.heat_map = QgsRasterLayer(file_name[0], "heat_map")
            self._configure_heat_map()

    def _configure_heat_map(self):
        stats = self.heat_map.dataProvider().bandStatistics(1)
        max_val = stats.maximumValue
        fcn = QgsColorRampShader()
        fcn.setColorRampType(QgsColorRampShader.Interpolated)
        lst = [
            QgsColorRampShader.ColorRampItem(0, QColor(0, 0, 0)),
            QgsColorRampShader.ColorRampItem(max_val, QColor(255, 255, 255))
        ]
        fcn.setColorRampItemList(lst)
        shader = QgsRasterShader()
        shader.setRasterShaderFunction(fcn)

        renderer = QgsSingleBandPseudoColorRenderer(self.heat_map.dataProvider(), 1, shader)
        self.heat_map.setRenderer(renderer)

        QgsProject.instance().addMapLayer(self.heat_map)
        dest_crs = self.map_layer.crs()
        raster_crs = self.heat_map.crs()

        self.heat_map.setCrs(raster_crs)
        self.canvas.setDestinationCrs(dest_crs)

        self.canvas.setLayers([
            self.heat_map, self.estimate, self.ground_truth,
            self.vehicle, self.ping_layer, self.vehicle_path, self.map_layer
        ])

    def plot_precision(self, coord, freq, num_pings):
        data_dir = 'holder'
        output_file_name = f'/{data_dir}/PRECISION_{freq/1e7:.3f}_{num_pings}_heat_map.tiff'
        file_name = QDir().currentPath() + output_file_name

        if self.heat_map is not None:
            QgsProject.instance().removeMapLayer(self.heat_map)
        
        self.heat_map = QgsRasterLayer(file_name, "heat_map")
        self._configure_heat_map()
        self.heat_map.renderer().setOpacity(0.7)

        self.canvas.setLayers([
            self.heat_map, self.estimate, self.ground_truth,
            self.vehicle, self.ping_layer, self.vehicle_path, self.map_layer
        ])

    def adjust_canvas(self):
        self.canvas.setExtent(self.map_layer.extent())
        self.canvas.setLayers([
            self.precision, self.estimate, self.ground_truth,
            self.vehicle, self.ping_layer, self.cones,
            self.vehicle_path, self.polygon_layer, self.map_layer
        ])
        self.canvas.zoomToFullExtent()
        self.canvas.freeze(True)
        self.canvas.show()
        self.canvas.refresh()
        self.canvas.freeze(False)
        self.canvas.repaint()

    def add_toolbar(self):
        actions = [
            ("Zoom in", self.zoom_in),
            ("Zoom out", self.zoom_out),
            ("Pan", self.pan),
            ("Polygon", self.polygon)
        ]
        
        for name, func in actions:
            action = QAction(name, self)
            action.setCheckable(True)
            action.triggered.connect(func)
            self.toolbar.addAction(action)
            setattr(self, f"action_{name.lower().replace(' ', '_')}", action)

        self.tool_pan = QgsMapToolPan(self.canvas)
        self.tool_pan.setAction(self.action_pan)
        self.tool_zoom_in = QgsMapToolZoom(self.canvas, False)
        self.tool_zoom_in.setAction(self.action_zoom_in)
        self.tool_zoom_out = QgsMapToolZoom(self.canvas, True)
        self.tool_zoom_out.setAction(self.action_zoom_out)
        self.tool_polygon = PolygonMapTool(self.canvas)
        self.tool_polygon.setAction(self.action_polygon)

    def polygon(self):
        self.canvas.setMapTool(self.tool_polygon)

    def zoom_in(self):
        self.canvas.setMapTool(self.tool_zoom_in)

    def zoom_out(self):
        self.canvas.setMapTool(self.tool_zoom_out)

    def pan(self):
        self.canvas.setMapTool(self.tool_pan)

    def plot_vehicle(self, id, coord):
        lat, lon = coord[0], coord[1]
        point = self.transform_to_web.transform(QgsPointXY(lon, lat))
        if self.vehicle is None:
            return

        vehicle_data = self.vehicle_data.get(id, VehicleData())
        self.vehicle_data[id] = vehicle_data

        if vehicle_data.ind > 0:
            self._update_vehicle_path(vehicle_data, point)
            self._update_vehicle_position(vehicle_data)

        vehicle_data.last_loc = point
        self._add_new_vehicle_position(point)
        self.ind += 1
        vehicle_data.ind = self.ind

    def _update_vehicle_path(self, vehicle_data, point):
        lpr = self.vehicle_path.dataProvider()
        lin = QgsGeometry.fromPolylineXY([vehicle_data.last_loc, point])
        line_feat = QgsFeature()
        line_feat.setGeometry(lin)
        lpr.addFeatures([line_feat])

    def _update_vehicle_position(self, vehicle_data):
        self.vehicle.startEditing()
        self.vehicle.deleteFeature(vehicle_data.ind)
        self.vehicle.commitChanges()

    def _add_new_vehicle_position(self, point):
        vpr = self.vehicle.dataProvider()
        pnt = QgsGeometry.fromPointXY(point)
        f = QgsFeature()
        f.setGeometry(pnt)
        vpr.addFeatures([f])
        self.vehicle.updateExtents()

    def plot_cone(self, coord):
        lat, lon, heading = coord[0], coord[1], coord[4]
        power_arr = [2.4, 4, 5, 2.1, 3, 8, 5.9, 2, 1, 3, 5, 4]
        aind = self.ind_cone % 12
        power = power_arr[aind]

        point = self.transform_to_web.transform(QgsPointXY(lon, lat))
        self.cone_min = min(self.cone_min, power)
        self.cone_max = max(self.cone_max, power)

        if self.cones is None:
            return

        if self.ind_cone > 4:
            self._remove_old_cone()

        self._update_cone_colors()
        self._add_new_cone(point, heading, power)

    def _remove_old_cone(self):
        self.cones.startEditing()
        self.cones.deleteFeature(self.ind_cone - 5)
        self.cones.commitChanges()

    def _update_cone_colors(self):
        updates = {}
        opacity = 1
        for update_ind in range(self.ind_cone, max(self.ind_cone - 5, -1), -1):
            feature = self.cones.getFeature(update_ind)
            amp = feature.attributes()[1]
            color = self.calc_color(amp, self.cone_min, self.cone_max, opacity)
            height = self.calc_height(amp, self.cone_min, self.cone_max)
            updates[update_ind] = {2: color, 3: height}
            opacity -= opacity -= 0.2

        self.cones.dataProvider().changeAttributeValues(updates)

    def _add_new_cone(self, point, heading, power):
        cpr = self.cones.dataProvider()
        feature = QgsFeature()
        feature.setFields(self.cones.fields())
        feature.setGeometry(QgsGeometry.fromPointXY(point))
        feature.setAttribute(0, heading)
        feature.setAttribute(1, power)
        feature.setAttribute(2, self.calc_color(power, self.cone_min, self.cone_max, 1))
        feature.setAttribute(3, self.calc_height(power, self.cone_min, self.cone_max))
        feature.setAttribute(4, "bottom")
        cpr.addFeatures([feature])
        self.cones.updateExtents()
        self.ind_cone += 1

    def calc_color(self, amp, min_amp, max_amp, opac):
        if min_amp == max_amp:
            color_ratio = 0.5
        else:
            color_ratio = (amp - min_amp) / (max_amp - min_amp)
        red = int(255 * color_ratio)
        blue = int(255 * (1 - color_ratio))
        opacity = int(255 * opac)
        return f"#{opacity:02x}{red:02x}00{blue:02x}"

    def calc_height(self, amp, min_amp, max_amp):
        if min_amp == max_amp:
            return 4.0
        return 3.0 * (amp - min_amp) / (max_amp - min_amp) + 1

    def plot_ping(self, coord, power):
        lat, lon = coord[0], coord[1]
        point = self.transform_to_web.transform(QgsPointXY(lon, lat))
        
        if self.ping_layer is None:
            return

        self._update_ping_range(power)
        self._add_new_ping(point, power)

    def _update_ping_range(self, power):
        change = False
        if power < self.ping_min:
            self.ping_min = power
            change = True
        if power > self.ping_max:
            self.ping_max = power
            change = True
        
        if change:
            self._update_ping_renderer()

    def _update_ping_renderer(self):
        r = self.ping_max - self.ping_min
        ranges = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84]
        labels = ['Blue', 'Cyan', 'Green', 'Yellow', 'Orange', 'ORed', 'Red']

        for i, (label, upper) in enumerate(zip(labels, ranges + [1])):
            lower = ranges[i-1] if i > 0 else 0
            self.ping_renderer.updateRangeLowerValue(i, self.ping_min + r * lower)
            self.ping_renderer.updateRangeUpperValue(i, self.ping_min + r * upper)

    def _add_new_ping(self, point, power):
        vpr = self.ping_layer.dataProvider()
        feature = QgsFeature()
        feature.setFields(self.ping_layer.fields())
        feature.setGeometry(QgsGeometry.fromPointXY(point))
        feature.setAttribute(0, power)
        vpr.addFeatures([feature])
        self.ping_layer.updateExtents()

    def plot_estimate(self, coord, frequency):
        lat, lon = coord[0], coord[1]
        point = self.transform_to_web.transform(QgsPointXY(lon, lat))

        if self.estimate is None:
            return

        if self.ind_est > 0:
            self._update_estimate(point)
        else:
            self._add_new_estimate(point)

    def _update_estimate(self, point):
        self.estimate.startEditing()
        self.estimate.deleteFeature(self.ind_est)
        self.estimate.commitChanges()
        self._add_new_estimate(point)

    def _add_new_estimate(self, point):
        vpr = self.estimate.dataProvider()
        feature = QgsFeature()
        feature.setGeometry(QgsGeometry.fromPointXY(point))
        vpr.addFeatures([feature])
        self.estimate.updateExtents()
        self.ind_est += 1

class MapOptions(QWidget):
    def __init__(self):
        super().__init__()
        self.map_widget = None
        self.btn_cache_map = None
        self.is_web_map = False
        self.lbl_dist = None
        self._create_widgets()
        self.created = False
        self.writer = None
        self.has_point = False
        self.user_pops = UserPopups()

    def _create_widgets(self):
        layout = QVBoxLayout()
        layout.addWidget(QLabel('Map Options'))

        self.btn_set_search_area = QPushButton('Set Search Area')
        self.btn_set_search_area.setEnabled(False)
        layout.addWidget(self.btn_set_search_area)

        self.btn_cache_map = QPushButton('Cache Map')
        self.btn_cache_map.clicked.connect(self._cache_map)
        self.btn_cache_map.setEnabled(False)
        layout.addWidget(self.btn_cache_map)

        self.btn_clear_map = QPushButton('Clear Map')
        self.btn_clear_map.clicked.connect(self.clear)
        layout.addWidget(self.btn_clear_map)

        export_layout = QVBoxLayout()
        for label in ['Pings', 'Vehicle Path', 'Polygon', 'Cones']:
            btn = QPushButton(label)
            btn.clicked.connect(getattr(self, f'export_{label.lower().replace(" ", "_")}'))
            export_layout.addWidget(btn)

        export_widget = QWidget()
        export_widget.setLayout(export_layout)
        layout.addWidget(export_widget)

        dist_layout = QHBoxLayout()
        dist_layout.addWidget(QLabel('Distance from Actual'))
        self.lbl_dist = QLabel('')
        dist_layout.addWidget(self.lbl_dist)
        layout.addLayout(dist_layout)

        self.setLayout(layout)

    def clear(self):
        if self.map_widget is None:
            return
        self.map_widget.tool_polygon.rubber_band.reset(QgsWkbTypes.PolygonGeometry)
        self.map_widget.tool_rect.rubber_band.reset(QgsWkbTypes.PolygonGeometry)
        self.map_widget.tool_polygon.vertices.clear()

    def _cache_map(self):
        if not self.is_web_map:
            print("alert")
            return

        if self.map_widget.tool_rect.rectangle() is None:
            self.user_pops.show_warning(
                "Use the rect tool to choose an area on the map to cache",
                "No specified area to cache!"
            )
            self.map_widget.rect()
        else:
            cache_thread = Thread(target=self.map_widget.cache_map)
            cache_thread.start()
            self.map_widget.canvas.refresh()

    def set_map(self, map_widget: 'MapWidget', is_web_map: bool):
        self.is_web_map = is_web_map
        self.map_widget = map_widget
        self.btn_cache_map.setEnabled(is_web_map)

    def est_distance(self, coord, stale, res):
        lat1, lon1 = coord[0], coord[1]
        lat2, lon2 = 32.885889, -117.234028

        if not self.has_point:
            self._add_ground_truth_point(lat2, lon2)

        dist = self.distance(lat1, lat2, lon1, lon2)
        self._write_results(dist, res)
        self.lbl_dist.setText(f'{dist:.3f}(m.)')

    def _add_ground_truth_point(self, lat, lon):
        point = self.map_widget.transform_to_web.transform(QgsPointXY(lon, lat))
        vpr = self.map_widget.ground_truth.dataProvider()
        feature = QgsFeature()
        feature.setGeometry(QgsGeometry.fromPointXY(point))
        vpr.addFeatures([feature])
        self.map_widget.ground_truth.updateExtents()
        self.has_point = True

    def _write_results(self, dist, res):
        field_names = ['Distance', 'res.x', 'residuals']
        mode = 'w' if not self.created else 'a+'
        with open('results.csv', mode, newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=field_names)
            if not self.created:
                writer.writeheader()
                self.created = True
            writer.writerow({
                'Distance': str(dist),
                'res.x': str(res.x),
                'residuals': str(res.fun)
            })

    @staticmethod
    def distance(lat1, lat2, lon1, lon2):
        lon1, lon2, lat1, lat2 = map(math.radians, [lon1, lon2, lat1, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371  # Radius of Earth in kilometers
        return c * r * 1000

    def export_layer(self, layer_name: str, file_name: str):
        if self.map_widget is None:
            self.user_pops.show_warning("Load a map before exporting.")
            return

        folder = str(QFileDialog.getExistingDirectory(self, "Select Directory"))
        file_path = os.path.join(folder, file_name)
        options = QgsVectorFileWriter.SaveVectorOptions()
        options.driverName = "ESRI Shapefile"

        layer = getattr(self.map_widget, layer_name)
        QgsVectorFileWriter.writeAsVectorFormatV2(
            layer, file_path, QgsCoordinateTransformContext(), options
        )

    def export_ping(self):
        self.export_layer('ping_layer', 'pings.shp')

    def export_vehicle_path(self):
        self.export_layer('vehicle_path', 'vehicle_path.shp')

    def export_polygon(self):
        if self.map_widget is None:
            self.user_pops.show_warning("Load a map before exporting.")
            return

        if self.map_widget.tool_polygon is None:
            return

        if not self.map_widget.tool_polygon.vertices:
            self.user_pops.show_warning(
                "Use the polygon tool to choose an area on the map to export",
                "No specified area to export!"
            )
            self.map_widget.polygon()
            return

        vpr = self.map_widget.polygon_layer.dataProvider()
        points = self.map_widget.tool_polygon.vertices
        poly_geom = QgsGeometry.fromPolygonXY([points])

        feature = QgsFeature()
        feature.setGeometry(poly_geom)
        vpr.addFeatures([feature])
        self.map_widget.polygon_layer.updateExtents()

        folder = str(QFileDialog.getExistingDirectory(self, "Select Directory"))
        file_path = os.path.join(folder, 'polygon.shp')
        options = QgsVectorFileWriter.SaveVectorOptions()
        options.driverName = "ESRI Shapefile"

        QgsVectorFileWriter.writeAsVectorFormatV2(
            self.map_widget.polygon_layer, file_path,
            QgsCoordinateTransformContext(), options
        )
        vpr.truncate()

    def export_cone(self):
        self.export_layer('cones', 'cones.shp')

class WebMap(MapWidget):
    def __init__(self, root, p1_lat, p1_lon, p2_lat, p2_lon, load_cached):
        super().__init__(root)
        self.load_cached = load_cached
        self.add_layers()
        self.adjust_canvas()
        r = QgsRectangle(p1_lon, p2_lat, p2_lon, p1_lat)
        rect = self.transform_to_web.transformBoundingBox(r)
        self.canvas.zoomToFeatureExtent(rect)
        self.add_toolbar()
        self.add_rect_tool()
        self.pan()
        self._setup_layout(root)

    def _setup_layout(self, root):
        self.holder.addWidget(self.toolbar)
        self.holder.addWidget(self.canvas)
        self.setLayout(self.holder)
        root.addWidget(self, 0, 1, 1, 2)
        self.root = root

    def add_layers(self):
        layers = [
            self.set_up_estimate(),
            self.set_up_vehicle_layers(),
            self.set_up_ping_layer(),
            self.set_up_ground_truth(),
            self.set_up_cone_layer(),
            self.set_up_polygon_layer()
        ]
        for layer in layers:
            if isinstance(layer, tuple):
                for l in layer:
                    QgsProject.instance().addMapLayer(l)
            else:
                QgsProject.instance().addMapLayer(layer)

        self._setup_base_layer()

    def _setup_base_layer(self):
        if self.load_cached:
            path = QDir().currentPath()
            url_with_params = f'type=xyz&url=file:///{path}/tiles/%7Bz%7D/%7Bx%7D/%7By%7D.png'
        else:
            url_with_params = 'type=xyz&url=http://a.tile.openstreetmap.org/%7Bz%7D/%7Bx%7D/%7By%7D.png&zmax=19&zmin=0&crs=EPSG3857'
        
        self.map_layer = QgsRasterLayer(url_with_params, 'OpenStreetMap', 'wms')
        
        if self.map_layer.isValid():
            crs = QgsCoordinateReferenceSystem("EPSG:3857")
            self.map_layer.setCrs(crs)
            QgsProject.instance().addMapLayer(self.map_layer)
        else:
            print('invalid map_layer')
            raise RuntimeError("Invalid map layer")

    def add_rect_tool(self):
        self.rect_action = QAction("Rect", self)
        self.rect_action.setCheckable(True)
        self.rect_action.triggered.connect(self.rect)
        self.toolbar.addAction(self.rect_action)
        self.tool_rect = RectangleMapTool(self.canvas)
        self.tool_rect.setAction(self.rect_action)

    def rect(self):
        self.canvas.setMapTool(self.tool_rect)

    @staticmethod
    def degree_to_tile_num(lat_deg, lon_deg, zoom):
        lat_rad = math.radians(lat_deg)
        n = 2.0 ** zoom
        x = int((lon_deg + 180.0) / 360.0 * n)
        y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
        return (x, y)

    def cache_map(self):
        if self.tool_rect.rectangle() is None:
            return
        
        rect = self.tool_rect.rectangle()
        r = self.transform.transformBoundingBox(rect, QgsCoordinateTransform.ForwardTransform, True)
        print(f"Rectangle: {r.xMinimum()}, {r.yMinimum()}, {r.xMaximum()}, {r.yMaximum()}")
        
        if r is not None:
            self._download_tiles(r)

    def _download_tiles(self, r):
        zoom_start = 17
        tile_count = 0
        for zoom in range(zoom_start, 19):
            x_min, y_min = self.degree_to_tile_num(r.yMinimum(), r.xMinimum(), zoom)
            x_max, y_max = self.degree_to_tile_num(r.yMaximum(), r.xMaximum(), zoom)
            print(f"Zoom: {zoom}")
            print(f"{x_min}, {x_max}, {y_min}, {y_max}")
            for x in range(x_min, x_max + 1):
                for y in range(y_max, y_min + 1):
                    if tile_count < 200:
                        time.sleep(1)
                        downloaded = self.download_tile(x, y, zoom)
                        if downloaded:
                            tile_count += 1
                    else:
                        print("Tile count exceeded, please try again in a few minutes")
                        return
        print("Download Complete")

    def download_tile(self, x_tile, y_tile, zoom):
        url = f"http://c.tile.openstreetmap.org/{zoom}/{x_tile}/{y_tile}.png"
        dir_path = f"tiles/{zoom}/{x_tile}/"
        download_path = f"{dir_path}{y_tile}.png"

        if not os.path.exists(dir_path):
            os.makedirs(dir_path)

        if not os.path.isfile(download_path):
            print(f"downloading {url}")
            headers = {
                'User-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36'
            }
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                with open(download_path, 'wb') as f:
                    f.write(response.content)
                return True
            else:
                print(f"Failed to download {url}")
                return False
        else:
            print(f"skipped {url}")
            return False

class StaticMap(MapWidget):
    def __init__(self, root):
        super().__init__(root)
        self.file_name = self._get_file_name()
        self._add_layers()
        self.adjust_canvas()
        self.add_toolbar()
        self.pan()
        self._setup_layout(root)

    def _get_file_name(self):
        return QFileDialog.getOpenFileName()[0]

    def _add_layers(self):
        if not self.file_name:
            return

        self.map_layer = QgsRasterLayer(self.file_name, "SRTM layer name")
        if not self.map_layer.crs().isValid():
            raise FileNotFoundError("Invalid file, loading from web...")
        print(self.map_layer.crs())

        layers = [
            self._setup_estimate_layer(),
            self._setup_vehicle_layers(),
            self._setup_ping_layer(),
        ]

        for layer in layers:
            if isinstance(layer, tuple):
                for l in layer:
                    QgsProject.instance().addMapLayer(l)
            else:
                QgsProject.instance().addMapLayer(layer)

        QgsProject.instance().addMapLayer(self.map_layer)

    def _setup_estimate_layer(self):
        uri = "Point?crs=epsg:4326"
        layer = QgsVectorLayer(uri, 'Estimate', "memory")
        symbol = QgsMarkerSymbol.createSimple({'name': 'diamond', 'color': 'blue'})
        layer.renderer().setSymbol(symbol)
        layer.setAutoRefreshInterval(500)
        layer.setAutoRefreshEnabled(True)
        return layer

    def _setup_vehicle_layers(self):
        uri = "Point?crs=epsg:4326"
        uri_line = "Linestring?crs=epsg:4326"
        vehicle_layer = QgsVectorLayer(uri, 'Vehicle', "memory")
        vehicle_path_layer = QgsVectorLayer(uri_line, 'vehicle_path', "memory")

        path = os.path.join(QDir.currentPath(), 'camera.svg')
        symbol_svg = QgsSvgMarkerSymbolLayer(path)
        symbol_svg.setSize(4)
        symbol_svg.setFillColor(QColor('#0000ff'))
        symbol_svg.setStrokeColor(QColor('#ff0000'))
        symbol_svg.setStrokeWidth(1)

        vehicle_layer.renderer().symbol().changeSymbolLayer(0, symbol_svg)
        vehicle_layer.setAutoRefreshInterval(500)
        vehicle_layer.setAutoRefreshEnabled(True)
        vehicle_path_layer.setAutoRefreshInterval(500)
        vehicle_path_layer.setAutoRefreshEnabled(True)

        return vehicle_layer, vehicle_path_layer

    def _setup_ping_layer(self):
        uri = "Point?crs=epsg:4326"
        layer = QgsVectorLayer(uri, 'Pings', 'memory')

        symbols = {
            'blue': QgsSymbol.defaultSymbol(layer.geometryType()),
            'green': QgsSymbol.defaultSymbol(layer.geometryType()),
            'yellow': QgsSymbol.defaultSymbol(layer.geometryType()),
            'orange': QgsSymbol.defaultSymbol(layer.geometryType()),
            'red': QgsSymbol.defaultSymbol(layer.geometryType())
        }

        for color, symbol in symbols.items():
            symbol.setColor(QColor(color))

        ranges = [
            QgsRendererRange(0, 20, symbols['blue'], 'Blue'),
            QgsRendererRange(20, 40, symbols['green'], 'Green'),
            QgsRendererRange(40, 60, symbols['yellow'], 'Yellow'),
            QgsRendererRange(60, 80, symbols['orange'], 'Orange'),
            QgsRendererRange(80, 100, symbols['red'], 'Red')
        ]

        renderer = QgsGraduatedSymbolRenderer('Amp', ranges)
        classification_method = QgsApplication.classificationMethodRegistry().method("EqualInterval")
        renderer.setClassificationMethod(classification_method)
        renderer.setClassAttribute('Amp')

        layer.dataProvider().addAttributes([QgsField(name='Amp', type=QVariant.Double, len=30)])
        layer.updateFields()

        layer.setRenderer(renderer)
        layer.setAutoRefreshInterval(500)
        layer.setAutoRefreshEnabled(True)

        return layer