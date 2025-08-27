import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CalculatorFormProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

export default function CalculatorForm({ title, description, icon, children }: CalculatorFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          {icon}
          <div>
            <h3 className="font-bold">{title}</h3>
            <p className="text-sm font-normal text-muted-foreground">{description}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
      </CardContent>
    </Card>
  );
}
