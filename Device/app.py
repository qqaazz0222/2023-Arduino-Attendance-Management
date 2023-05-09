import serial
import time

py_serial = serial.Serial(
    
    # Window
    port='/dev/cu.usbmodem11401',
    
    # 보드 레이트 (통신 속도)
    baudrate=9600,
)

while True:
      
    commend = input('아두이노에게 내릴 명령:')
    
    py_serial.write(commend.encode())
    
    time.sleep(0.1)
    
    if py_serial.readable():
        
        # 들어온 값이 있으면 값을 한 줄 읽음 (BYTE 단위로 받은 상태)
        # BYTE 단위로 받은 response 모습 : b'\xec\x97\x86\xec\x9d\x8c\r\n'
        response = py_serial.readline()
        
        # 디코딩 후, 출력 (가장 끝의 \n을 없애주기위해 슬라이싱 사용)
        print(response.decode())