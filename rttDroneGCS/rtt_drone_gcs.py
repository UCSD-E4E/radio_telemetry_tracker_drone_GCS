import logging
from .mav.mav_model import MAVModel
import rttDroneComms.comms

def main():
    logging.basicConfig(level=logging.INFO)
    receiver = rttDroneComms.comms.gcsComms()
    mav_model = MAVModel(receiver)
    mav_model.start()

if __name__ == "__main__":
    main()
