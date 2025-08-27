import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calculator, History, Weight } from "lucide-react";

interface MetalWeightInputs {
  materialType: string;
  length: number;
  width: number;
  thickness: number;
}

interface TMTInputs {
  diameter: string;
  lengthPerBar: number;
  numberOfBars: number;
}

export default function Calculators() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [metalWeightInputs, setMetalWeightInputs] = useState<MetalWeightInputs>({
    materialType: "steel",
    length: 0,
    width: 0,
    thickness: 0,
  });

  const [tmtInputs, setTMTInputs] = useState<TMTInputs>({
    diameter: "12",
    lengthPerBar: 0,
    numberOfBars: 0,
  });

  const [metalWeightResult, setMetalWeightResult] = useState<number | null>(null);
  const [tmtResult, setTMTResult] = useState<{ weight: number; cost: number } | null>(null);

  const { data: calculations = [] } = useQuery({
    queryKey: ["/api/calculations"],
  });

  const saveCalculation = useMutation({
    mutationFn: async (data: {
      calculatorType: string;
      inputs: any;
      result: any;
    }) => {
      await apiRequest("POST", "/api/calculations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calculations"] });
    },
  });

  const calculateMetalWeight = () => {
    const { materialType, length, width, thickness } = metalWeightInputs;
    
    if (!length || !width || !thickness) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all dimensions",
        variant: "destructive",
      });
      return;
    }

    // Density values (kg/cm³)
    const densities = {
      steel: 0.00785,
      iron: 0.00787,
      aluminum: 0.0027,
    };

    const density = densities[materialType as keyof typeof densities] || densities.steel;
    
    // Convert mm to cm and calculate volume in cm³
    const volumeCm3 = (length / 10) * (width / 10) * (thickness / 10);
    const weight = volumeCm3 * density;
    
    setMetalWeightResult(weight);
    
    saveCalculation.mutate({
      calculatorType: "metal_weight",
      inputs: metalWeightInputs,
      result: { weight },
    });
  };

  const calculateTMT = () => {
    const { diameter, lengthPerBar, numberOfBars } = tmtInputs;
    
    if (!lengthPerBar || !numberOfBars) {
      toast({
        title: "Invalid Input",
        description: "Please fill in length and number of bars",
        variant: "destructive",
      });
      return;
    }

    // Weight per meter for different diameters (kg/m)
    const weightPerMeter = {
      "8": 0.395,
      "10": 0.617,
      "12": 0.888,
      "16": 1.578,
      "20": 2.466,
      "25": 3.854,
      "32": 6.313,
    };

    const weightPerM = weightPerMeter[diameter as keyof typeof weightPerMeter] || weightPerMeter["12"];
    const totalWeight = weightPerM * lengthPerBar * numberOfBars;
    
    // Estimated cost (₹2200 per ton average)
    const estimatedCost = (totalWeight / 1000) * 2200;
    
    const result = { weight: totalWeight, cost: estimatedCost };
    setTMTResult(result);
    
    saveCalculation.mutate({
      calculatorType: "tmt_rebar",
      inputs: tmtInputs,
      result,
    });
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground">
        <h1 className="text-xl font-bold">Calculators</h1>
        <p className="text-sm opacity-90">Construction material calculation tools</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Metal Weight Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Weight className="h-6 w-6" />
              <div>
                <h3 className="font-bold">Metal Weight Calculator</h3>
                <p className="text-sm font-normal text-muted-foreground">
                  Calculate weight of metal sheets, rods, and pipes
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="material-type">Material Type</Label>
              <Select
                value={metalWeightInputs.materialType}
                onValueChange={(value) =>
                  setMetalWeightInputs({ ...metalWeightInputs, materialType: value })
                }
              >
                <SelectTrigger data-testid="select-material-type">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="steel">Steel</SelectItem>
                  <SelectItem value="iron">Iron</SelectItem>
                  <SelectItem value="aluminum">Aluminum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="length">Length (mm)</Label>
                <Input
                  id="length"
                  type="number"
                  placeholder="1000"
                  value={metalWeightInputs.length || ""}
                  onChange={(e) =>
                    setMetalWeightInputs({
                      ...metalWeightInputs,
                      length: parseFloat(e.target.value) || 0,
                    })
                  }
                  data-testid="input-length"
                />
              </div>
              <div>
                <Label htmlFor="width">Width (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  placeholder="500"
                  value={metalWeightInputs.width || ""}
                  onChange={(e) =>
                    setMetalWeightInputs({
                      ...metalWeightInputs,
                      width: parseFloat(e.target.value) || 0,
                    })
                  }
                  data-testid="input-width"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="thickness">Thickness (mm)</Label>
              <Input
                id="thickness"
                type="number"
                placeholder="10"
                value={metalWeightInputs.thickness || ""}
                onChange={(e) =>
                  setMetalWeightInputs({
                    ...metalWeightInputs,
                    thickness: parseFloat(e.target.value) || 0,
                  })
                }
                data-testid="input-thickness"
              />
            </div>
            
            <Button
              onClick={calculateMetalWeight}
              className="w-full"
              data-testid="button-calculate-weight"
            >
              Calculate Weight
            </Button>
            
            {metalWeightResult !== null && (
              <div className="bg-muted p-3 rounded text-center">
                <p className="text-sm text-muted-foreground">Calculated Weight</p>
                <p className="font-bold text-lg" data-testid="text-weight-result">
                  {metalWeightResult.toFixed(2)} kg
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TMT Rebar Steel Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Calculator className="h-6 w-6" />
              <div>
                <h3 className="font-bold">TMT Rebar Steel Calculator</h3>
                <p className="text-sm font-normal text-muted-foreground">
                  Calculate TMT bar weight and quantity
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="diameter">Bar Diameter</Label>
              <Select
                value={tmtInputs.diameter}
                onValueChange={(value) => setTMTInputs({ ...tmtInputs, diameter: value })}
              >
                <SelectTrigger data-testid="select-diameter">
                  <SelectValue placeholder="Select diameter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8mm</SelectItem>
                  <SelectItem value="10">10mm</SelectItem>
                  <SelectItem value="12">12mm</SelectItem>
                  <SelectItem value="16">16mm</SelectItem>
                  <SelectItem value="20">20mm</SelectItem>
                  <SelectItem value="25">25mm</SelectItem>
                  <SelectItem value="32">32mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="length-per-bar">Length per Bar (meters)</Label>
              <Input
                id="length-per-bar"
                type="number"
                placeholder="12"
                value={tmtInputs.lengthPerBar || ""}
                onChange={(e) =>
                  setTMTInputs({
                    ...tmtInputs,
                    lengthPerBar: parseFloat(e.target.value) || 0,
                  })
                }
                data-testid="input-length-per-bar"
              />
            </div>
            
            <div>
              <Label htmlFor="number-of-bars">Number of Bars</Label>
              <Input
                id="number-of-bars"
                type="number"
                placeholder="100"
                value={tmtInputs.numberOfBars || ""}
                onChange={(e) =>
                  setTMTInputs({
                    ...tmtInputs,
                    numberOfBars: parseInt(e.target.value) || 0,
                  })
                }
                data-testid="input-number-of-bars"
              />
            </div>
            
            <Button
              onClick={calculateTMT}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              data-testid="button-calculate-tmt"
            >
              Calculate TMT Weight
            </Button>
            
            {tmtResult && (
              <div className="bg-muted p-3 rounded">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Weight</p>
                    <p className="font-bold" data-testid="text-tmt-weight">
                      {tmtResult.weight.toFixed(2)} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Cost</p>
                    <p className="font-bold text-primary" data-testid="text-tmt-cost">
                      ₹{tmtResult.cost.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calculation History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              Recent Calculations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calculations.length > 0 ? (
              <div className="space-y-2">
                {calculations.slice(0, 5).map((calc: any) => (
                  <div
                    key={calc.id}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {calc.calculatorType === "metal_weight"
                          ? `${calc.inputs.materialType} Sheet - ${calc.inputs.length}x${calc.inputs.width}x${calc.inputs.thickness}mm`
                          : `TMT ${calc.inputs.diameter}mm x ${calc.inputs.numberOfBars} bars`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(calc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-bold">
                      {calc.calculatorType === "metal_weight"
                        ? `${calc.result.weight.toFixed(2)} kg`
                        : `${calc.result.weight.toFixed(2)} kg`
                      }
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No calculations yet. Start calculating to see your history!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
