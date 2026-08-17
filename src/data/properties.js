// src/data/properties.js

export const propertiesData = [

  // =====================================================
  // KHU VỰC 1
  // =====================================================

  {
    id: "p1",
    region: 1,
    type: "property",
    name: "Phong Châu",

    price: 40,
    mortgage: 20,

    levels: {
      0: {
        name: "Đất trống",
        passageFee: 5
      },
      1: {
        name: "Cấp 1",
        upgradeCost: 20,
        sellValue: 10,
        passageFee: 10
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 50,
        sellValue: 25,
        passageFee: 15
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 100,
        sellValue: 50,
        passageFee: 25
      }
    }
  },

  {
    id: "p2",
    region: 1,
    type: "property",
    name: "Cổ Loa",

    price: 40,
    mortgage: 20,

    levels: {
      0: {
        name: "Đất trống",
        passageFee: 5
      },
      1: {
        name: "Cấp 1",
        upgradeCost: 20,
        sellValue: 10,
        passageFee: 10
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 50,
        sellValue: 25,
        passageFee: 15
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 100,
        sellValue: 50,
        passageFee: 25
      }
    }
  },

  {
    id: "p3",
    region: 1,
    type: "property",
    name: "Hoa Lư",

    price: 60,
    mortgage: 30,

    levels: {
      0: {
        name: "Đất trống",
        passageFee: 8
      },
      1: {
        name: "Cấp 1",
        upgradeCost: 30,
        sellValue: 15,
        passageFee: 15
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 75,
        sellValue: 38,
        passageFee: 25
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 150,
        sellValue: 75,
        passageFee: 40
      }
    }
  },

  {
    id: "p4",
    region: 1,
    type: "property",
    name: "Thăng Long",

    price: 80,
    mortgage: 40,

    levels: {
      0: {
        name: "Đất trống",
        passageFee: 10
      },
      1: {
        name: "Cấp 1",
        upgradeCost: 40,
        sellValue: 20,
        passageFee: 20
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 100,
        sellValue: 50,
        passageFee: 35
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 200,
        sellValue: 100,
        passageFee: 55
      }
    }
  },

  // =====================================================
  // KHU VỰC 2
  // =====================================================

  {
    id: "p5",
    region: 2,
    type: "property",
    name: "Thiên Trường",

    price: 100,
    mortgage: 50,

    levels: {
      0: { name: "Đất trống", passageFee: 10 },
      1: {
        name: "Cấp 1",
        upgradeCost: 50,
        sellValue: 25,
        passageFee: 20
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 125,
        sellValue: 63,
        passageFee: 35
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 250,
        sellValue: 125,
        passageFee: 60
      }
    }
  },

  {
    id: "p6",
    region: 2,
    type: "property",
    name: "Vân Đồn",

    price: 100,
    mortgage: 50,

    levels: {
      0: { name: "Đất trống", passageFee: 10 },
      1: {
        name: "Cấp 1",
        upgradeCost: 50,
        sellValue: 25,
        passageFee: 20
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 125,
        sellValue: 63,
        passageFee: 35
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 250,
        sellValue: 125,
        passageFee: 60
      }
    }
  },

  {
    id: "p7",
    region: 2,
    type: "property",
    name: "Lam Kinh",

    price: 120,
    mortgage: 60,

    levels: {
      0: { name: "Đất trống", passageFee: 12 },
      1: {
        name: "Cấp 1",
        upgradeCost: 60,
        sellValue: 30,
        passageFee: 25
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 150,
        sellValue: 75,
        passageFee: 40
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 300,
        sellValue: 150,
        passageFee: 70
      }
    }
  },

  {
    id: "p8",
    region: 2,
    type: "property",
    name: "Văn Miếu",

    price: 140,
    mortgage: 70,

    levels: {
      0: { name: "Đất trống", passageFee: 15 },
      1: {
        name: "Dinh điện",
        upgradeCost: 80,
        sellValue: 40,
        passageFee: 30
      },
      2: {
        name: "Phủ đệ",
        upgradeCost: 180,
        sellValue: 90,
        passageFee: 50
      },
      3: {
        name: "Phủ thành",
        upgradeCost: 350,
        sellValue: 175,
        passageFee: 80
      }
    }
  },

  // =====================================================
  // KHU VỰC 3
  // =====================================================

  {
    id: "p9",
    region: 3,
    type: "property",
    name: "Phố Hiến",

    price: 160,
    mortgage: 80,

    levels: {
      0: { name: "Đất trống", passageFee: 18 },
      1: {
        name: "Cấp 1",
        upgradeCost: 80,
        sellValue: 40,
        passageFee: 35
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 200,
        sellValue: 100,
        passageFee: 60
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 400,
        sellValue: 200,
        passageFee: 100
      }
    }
  },

  {
    id: "p9b",
    region: 3,
    type: "property",
    name: "Hội An",

    price: 160,
    mortgage: 80,

    levels: {
      0: { name: "Đất trống", passageFee: 18 },
      1: {
        name: "Cấp 1",
        upgradeCost: 80,
        sellValue: 40,
        passageFee: 35
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 200,
        sellValue: 100,
        passageFee: 60
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 400,
        sellValue: 200,
        passageFee: 100
      }
    }
  },

  {
    id: "p10",
    region: 3,
    type: "property",
    name: "Phú Xuân",

    price: 180,
    mortgage: 90,

    levels: {
      0: { name: "Đất trống", passageFee: 20 },
      1: {
        name: "Cấp 1",
        upgradeCost: 90,
        sellValue: 45,
        passageFee: 40
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 225,
        sellValue: 113,
        passageFee: 70
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 450,
        sellValue: 225,
        passageFee: 110
      }
    }
  },

  {
    id: "p11",
    region: 3,
    type: "property",
    name: "Kinh Thành Huế",

    price: 200,
    mortgage: 100,

    levels: {
      0: { name: "Đất trống", passageFee: 22 },
      1: {
        name: "Cấp 1",
        upgradeCost: 100,
        sellValue: 50,
        passageFee: 45
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 250,
        sellValue: 125,
        passageFee: 75
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 500,
        sellValue: 250,
        passageFee: 120
      }
    }
  },

  {
    id: "p12",
    region: 3,
    type: "property",
    name: "Chùa Thiên Mụ",

    price: 220,
    mortgage: 110,

    levels: {
      0: { name: "Đất trống", passageFee: 25 },
      1: {
        name: "Cấp 1",
        upgradeCost: 110,
        sellValue: 55,
        passageFee: 50
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 275,
        sellValue: 138,
        passageFee: 85
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 550,
        sellValue: 275,
        passageFee: 140
      }
    }
  },

  // =====================================================
  // KHU VỰC 4
  // =====================================================

  {
    id: "p13",
    region: 4,
    type: "property",
    name: "Ba Đình",

    price: 240,
    mortgage: 120,

    levels: {
      0: { name: "Đất trống", passageFee: 30 },
      1: {
        name: "Cấp 1",
        upgradeCost: 120,
        sellValue: 60,
        passageFee: 60
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 300,
        sellValue: 150,
        passageFee: 100
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 600,
        sellValue: 300,
        passageFee: 160
      }
    }
  },

  {
    id: "p13b",
    region: 4,
    type: "property",
    name: "Điện Biên",

    price: 240,
    mortgage: 120,

    levels: {
      0: { name: "Đất trống", passageFee: 30 },
      1: {
        name: "Cấp 1",
        upgradeCost: 120,
        sellValue: 60,
        passageFee: 60
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 300,
        sellValue: 150,
        passageFee: 100
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 600,
        sellValue: 300,
        passageFee: 160
      }
    }
  },

  {
    id: "p14",
    region: 4,
    type: "property",
    name: "Dinh Độc Lập",

    price: 260,
    mortgage: 130,

    levels: {
      0: { name: "Đất trống", passageFee: 30 },
      1: {
        name: "Cấp 1",
        upgradeCost: 130,
        sellValue: 65,
        passageFee: 65
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 325,
        sellValue: 163,
        passageFee: 110
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 650,
        sellValue: 325,
        passageFee: 180
      }
    }
  },

  {
    id: "p15",
    region: 4,
    type: "property",
    name: "Trường Sa",

    price: 300,
    mortgage: 150,

    levels: {
      0: { name: "Đất trống", passageFee: 35 },
      1: {
        name: "Cấp 1",
        upgradeCost: 150,
        sellValue: 75,
        passageFee: 70
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 375,
        sellValue: 188,
        passageFee: 120
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 750,
        sellValue: 375,
        passageFee: 200
      }
    }
  },

  {
    id: "p16",
    region: 4,
    type: "property",
    name: "Hà Nội (Mới)",

    price: 350,
    mortgage: 175,

    levels: {
      0: { name: "Đất trống", passageFee: 40 },
      1: {
        name: "Cấp 1",
        upgradeCost: 175,
        sellValue: 88,
        passageFee: 80
      },
      2: {
        name: "Cấp 2",
        upgradeCost: 440,
        sellValue: 220,
        passageFee: 140
      },
      3: {
        name: "Cấp 3",
        upgradeCost: 875,
        sellValue: 438,
        passageFee: 250
      }
    }
  },

  // =====================================================
  // BỐN BẾN TÀU
  // =====================================================

  {
    id: "port1",
    type: "station",
    name: "Bạch Đằng Giang",
    price: 150,
    mortgage: 75,

    feeTable: {
      1: 25,
      2: 50,
      3: 100,
      4: 150
    }
  },

  {
    id: "port2",
    type: "station",
    name: "Chi Lăng",
    price: 150,
    mortgage: 75,

    feeTable: {
      1: 25,
      2: 50,
      3: 100,
      4: 150
    }
  },

  {
    id: "port3",
    type: "station",
    name: "Rạch Gầm – Xoài Mút",
    price: 150,
    mortgage: 75,

    feeTable: {
      1: 25,
      2: 50,
      3: 100,
      4: 150
    }
  },

  {
    id: "port4",
    type: "station",
    name: "Cảng Nhà Rồng",
    price: 150,
    mortgage: 75,

    feeTable: {
      1: 25,
      2: 50,
      3: 100,
      4: 150
    }
  },

  // =====================================================
  // DỊCH TRẠM
  // =====================================================

  {
    id: "service1",
    type: "service",
    name: "Dịch Trạm Bắc Bộ",
    price: 120,
    mortgage: 60,

    feeRule: "dice_x4"
  },

  {
    id: "service2",
    type: "service",
    name: "Dịch Trạm Trung Bộ",
    price: 120,
    mortgage: 60,

    feeRule: "dice_x10"
  }
];