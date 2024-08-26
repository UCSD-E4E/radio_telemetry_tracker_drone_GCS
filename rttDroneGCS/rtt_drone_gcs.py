import logging
from .mav.mav_model import MAVModel
import rttDroneComms.comms
from .config import get_config_path, get_instance
from .gui.dialogs import ConfigDialog
from PyQt5.QtWidgets import QApplication
import sys


def main():
    logging.basicConfig(level=logging.INFO)
    app = QApplication(sys.argv)

    config = get_instance(get_config_path())
    config_dialog = ConfigDialog(None)
    if config_dialog.exec_() == ConfigDialog.Rejected:
        return

    receiver = rttDroneComms.comms.gcsComms()
    mav_model = MAVModel(receiver)
    mav_model.start()

    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
