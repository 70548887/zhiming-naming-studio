import datetime
from sxtwl import fromSolar

天干 = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
地支 = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
节气 = ["冬至", "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏",
    "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", 
    "立冬", "小雪", "大雪"]
星 = ["", "天蓬", "芮禽", "天冲", "天辅", "", "天心", "天柱", "天任", "天英"]
门 = ["", "休门", "死门", "伤门", "杜门", "", "开门", "惊门", "生门", "景门"]
神 = ["值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"]
宫 = ["", "坎1宫", "坤2宫", "震3宫", "巽4宫", "中5宫", "乾6宫", "兑7宫", "艮8宫", "离9宫"]

局数表 = [
    [1, 7, 4],  # 冬至
    [2, 8, 5],  # 小寒
    [3, 9, 6],  # 大寒
    [8, 5, 2],  # 立春
    [9, 6, 3],  # 雨水
    [1, 7, 4],  # 惊蛰
    [3, 9, 6],  # 春分
    [4, 1, 7],  # 清明
    [5, 2, 8],  # 谷雨
    [4, 1, 7],  # 立夏
    [5, 2, 8],  # 小满
    [6, 3, 9],  # 芒种
    [9, 3, 6],  # 夏至
    [8, 2, 5],  # 小暑
    [7, 1, 4],  # 大暑
    [2, 5, 8],  # 立秋
    [1, 4, 7],  # 处暑
    [9, 3, 6],  # 白露
    [7, 1, 4],  # 秋分
    [6, 9, 3],  # 寒露
    [5, 8, 2],  # 霜降
    [6, 9, 3],  # 立冬
    [5, 8, 2],  # 小雪
    [4, 7, 1],  # 大雪
]

顺 = [0, 8, 7, 4, 9, 5, 1, 6, 3, 2]
逆 = [0, 6, 9, 8, 3, 5, 7, 2, 1, 4]

def is_valid_datetime(year, month, day, hour):
    """
    判断给定的年、月、日、时是否合法

    """
    try:
        # 使用datetime验证日期和小时
        datetime.datetime(year=year, month=month, day=day, hour=hour)
        return True
    except ValueError:
        return False

def before_jieqi(lunar_dh):
    '''
    计算某日前的节气
    '''
    jieqi = -1
    lunar_dh = lunar_dh.after(1)
    while True:
        lunar_dh = lunar_dh.before(1)
        if lunar_dh.hasJieQi():
            jieqi = lunar_dh.getJieQi()
            break
    return jieqi

def jiazi(gan: int, zhi: int):
    '''
    根据干支计算六十甲子序数
    '''
    for i in range(60):
        if i % 10 == gan and i % 12 == zhi:
            return i
    return 0

class 奇门遁甲:
    def __init__(self) -> None:
        # 基本状态
        self.updated = False    # 计算结果是否更新
        
        # 时间信息
        self.year, self.month, self.day, self.hour = 0, 0, 0, 0
        self.年 = 0
        self.月 = 0
        self.日 = 0
        self.节气 = -1
        
        # 四柱八字
        self.年干, self.年支 = -1, -1
        self.月干, self.月支 = -1, -1
        self.日干, self.日支 = -1, -1
        self.时干, self.时支 = -1, -1
        
        # 奇门遁甲
        self.遁 = 0 # 阳为1，阴为0
        self.元 = -1 # 上为0，中为1，下为2
        self.局数 = 0
        self.值符星 = -1
        self.值使门 = -1
        self.地盘 = [-1 for i in range(9+1)]    # 下标 1-9
        self.天盘 = [-1 for i in range(9+1)]    # 下标 1-9
        self.星 = [-1 for i in range(9+1)]    # 下标 1-9
        self.门 = [-1 for i in range(9+1)]    # 下标 1-9
        self.神 = [-1 for i in range(9+1)]    # 下标 1-9
        self.暗干 = [-1 for i in range(9+1)]    # 下标 1-9
        
        self.天盘寄宫 = 0
    
    def set(self, year: int, month: int, day: int, hour: int) -> None:
        self.year, self.month, self.day, self.hour = year, month, day, hour
        self.updated = False

        
    def calculate(self) -> None:
        # 检测年月日时数据是否合法
        if not is_valid_datetime(year=self.year, month=self.month, day=self.day, hour=self.hour):
            raise ValueError("日期数据不合法！")
        if not (self.year >= 1900 and self.year <= 2100):
            raise ValueError("年份仅支持1900-2100！")
        
        # 计算农历年月日，节气
        self.lunar_dh = fromSolar(self.year, self.month, self.day)
        self.年 = self.lunar_dh.getLunarYear()
        self.月 = self.lunar_dh.getLunarMonth()
        self.日 = self.lunar_dh.getLunarDay()
        self.节气 = before_jieqi(self.lunar_dh)
        
        # 计算四柱八字
        self.年干, self.年支 = self.lunar_dh.getYearGZ().tg,            self.lunar_dh.getYearGZ().dz
        self.月干, self.月支 = self.lunar_dh.getMonthGZ().tg,           self.lunar_dh.getMonthGZ().dz
        self.日干, self.日支 = self.lunar_dh.getDayGZ().tg,             self.lunar_dh.getDayGZ().dz
        self.时干, self.时支 = self.lunar_dh.getHourGZ(self.hour).tg,   self.lunar_dh.getHourGZ(self.hour).dz
        
        # 计算奇门遁甲
        self.遁 = 1 if self.节气 < 12 else 0
        self.元 = jiazi(self.日干, self.日支) % 15 // 5
        self.局数 = 局数表[self.节气][self.元]
        
        # 摆地盘军
        direction = 1 if self.遁 == 1 else -1
        # 六仪
        for i in range(6):
            self.地盘[(self.局数 + i * direction + 8) % 9 + 1] = 4 + i
        # 三奇
        for i in range(3):
            self.地盘[(self.局数 - (i+1) * direction + 8) % 9 + 1] = 1 + i
        
        # 旬首的移动
        时干支 = jiazi(self.时干, self.时支)
        时旬首 = 4 + 时干支 // 10
        delta = 0
        loc = self.地盘.index(时旬首)
        while self.地盘[loc] != self.时干:
            loc = 顺[loc]
            delta += 1
        
        # 天盘军和星
        self.值符星 = self.地盘.index(时旬首)
        for i in range(1, 9+1):
            d = i
            for _ in range(delta):
                d = 顺[d]
            self.天盘[d] = self.地盘[i]
            self.星[d] = i
        
        # 八神
        direction = 顺 if self.遁 == 1 else 逆
        i = loc
        for k in range(8):
            self.神[i] = k
            i = direction[i]
        del i
        
        # 八门
        self.值使门 = self.地盘.index(时旬首)
        d = self.值使门
        pm = d
        direction = 1 if self.遁 == 1 else -1
        d = ( d + (时干支 % 10) * direction + 8 ) % 9 + 1
        for i in range(8):
            self.门[d] = pm
            d = 顺[d]
            pm = 顺[pm]
        
        # 暗干
        三奇六仪 = ["丁", "丙", "乙", "戊", "己", "庚", "辛", "壬", "癸"]
        direction = 1 if self.遁 == 1 else -1
        start = 5 if self.时干 == self.地盘[self.门.index(self.值使门)] else self.门.index(self.值使门)
        for i in range(9):
            self.暗干[(start + i * direction + 8) % 9 + 1] = 天干.index(三奇六仪[( 三奇六仪.index(天干[self.时干]) + i + 9 ) % 9])
        
        # 天盘寄宫
        self.天盘寄宫 = self.天盘.index(self.地盘[4])
        
        self.updated = True
        
    def show(self):
        if not self.updated:
            self.calculate()
            
        print('农历',self.年, self.月, self.日)
        print(
            天干[self.年干], 地支[self.年支], '年  ',
            天干[self.月干], 地支[self.月支], '月  ',
            天干[self.日干], 地支[self.日支], '日  ',
            天干[self.时干], 地支[self.时支], '时'
        )
        print('节气：', 节气[self.节气])
        print('局数：', end=' ')
        if self.元 == 0:
            print('上元', end=' ')
        if self.元 == 1:
            print('中元', end=' ')
        if self.元 == 2:
            print('下元', end='')
        print('%d局'%self.局数)
        
        print('值符：', 星[self.值符星])
        print('值使：', 门[self.值使门])
        
        for i in range(1, 10):
            print('--------------')
            print(i, '宫：')
            print('天盘军：', 天干[self.天盘[i]])
            print('地盘军：', 天干[self.地盘[i]])
            print('星：', 星[self.星[i]])
            print('神：', 神[self.神[i]])
            print('门：', 门[self.门[i]])
            print('暗干：', 天干[self.暗干[i]])